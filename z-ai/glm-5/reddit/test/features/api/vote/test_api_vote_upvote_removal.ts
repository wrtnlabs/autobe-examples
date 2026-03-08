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

export async function test_api_vote_upvote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member A (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(authorAuth);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member A to the community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a text post (score starts at 1 from self-upvote per spec)
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Verify initial post score is 1 (self-upvote)
  TestValidator.equals("initial post score should be 1", post.score, 1);
  // Capture initial author karma (should be 1 from self-upvote)
  const initialAuthorKarma = authorAuth.member.karma;
  // 5. Setup: Create member B (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(voterAuth);
  // 6. Subscribe member B to the community
  await generate_random_community_platform_member_subscriptions_create(
    voterConnection,
    { body: { community_id: community.id } },
  );
  // 7. Member B upvotes the post
  const upvote = await api.functional.communityPlatform.member.posts.vote.cast(
    voterConnection,
    {
      postId: post.id,
      body: { voteType: "upvote" } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(upvote);
  // Verify upvote was cast
  TestValidator.equals("upvote vote type", upvote.voteType, "upvote");
  // 8. Test Execution: Remove the upvote
  await api.functional.communityPlatform.member.posts.vote.removeVote(
    voterConnection,
    { postId: post.id },
  );
  // 9. Verify removal is idempotent - subsequent removal should return 404
  await TestValidator.httpError(
    "subsequent vote removal should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.vote.removeVote(
        voterConnection,
        { postId: post.id },
      );
    },
  );
}
