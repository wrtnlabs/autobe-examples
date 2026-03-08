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

export async function test_api_member_profile_with_negative_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the target member whose profile will have negative karma
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetMember);
  // 2. Create a community where the target member can post
  const community =
    await generate_random_community_platform_member_communities_create(
      targetMemberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the target member to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      targetMemberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    targetMemberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Create another member (downvoter)
  const downvoterConnection: api.IConnection = { host: connection.host };
  const downvoter = await authorize_member_join(downvoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(downvoter);
  // 6. Subscribe the downvoter to the community (required for voting)
  const downvoterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      downvoterConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(downvoterSubscription);
  // 7. Cast a downvote on the post
  const vote = await api.functional.communityPlatform.member.posts.vote.cast(
    downvoterConnection,
    {
      postId: post.id,
      body: { voteType: "downvote" },
    },
  );
  typia.assert(vote);
  // 8. Retrieve the target member's profile (unauthenticated call)
  const profile = await api.functional.communityPlatform.members.at(
    connection,
    {
      memberId: targetMember.id,
    },
  );
  typia.assert(profile);
  // 9. Verify the karma field is negative (less than 0)
  TestValidator.predicate("karma should be negative", profile.karma < 0);
  // 10. Verify the profile is still publicly accessible
  TestValidator.equals(
    "profile id matches target member",
    profile.id,
    targetMember.id,
  );
  TestValidator.equals(
    "username matches",
    profile.username,
    targetMember.username,
  );
}
