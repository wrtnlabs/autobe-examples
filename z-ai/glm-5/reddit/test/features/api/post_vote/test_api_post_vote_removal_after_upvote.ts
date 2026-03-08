import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_vote_removal_after_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create a new community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a text post in that community
  // Note: Posts are created with automatic self-upvote (score = 1)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Verify post was created with initial score of 1 (self-upvote)
  TestValidator.equals("initial post score", post.score, 1);
  // 5. Verify the author's initial karma from the post response
  const authorInitialKarma = post.author.karma;
  // 6. Cast an upvote on the post (this is idempotent since post already has self-upvote)
  const upvote = await api.functional.communityPlatform.member.posts.vote.cast(
    memberConnection,
    {
      postId: post.id,
      body: { voteType: "upvote" } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote type", upvote.voteType, "upvote");
  // 7. Remove the vote by setting voteType to null
  const removalResponse =
    await api.functional.communityPlatform.member.posts.vote.cast(
      memberConnection,
      {
        postId: post.id,
        body: { voteType: null } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  // 8. Verify the response indicates vote removal (null response)
  // The API spec indicates null is returned for vote removal
  TestValidator.predicate(
    "vote removal should return null or undefined",
    removalResponse === null || removalResponse === undefined,
  );
  // 9. Verify
}
