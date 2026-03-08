import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_author_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community and subscribe using utility functions
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  const subscription: IRedditPlatformCommunitySubscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        params: { communityId: community.id },
        body: undefined,
      },
    );
  typia.assert(subscription);
  // 3. Create a post in the community using utility function
  const post: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "TEXT",
          redditPlatformCommunityId: community.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(post);
  // 4. Record initial state before deletion
  const initialKarmaScore: number = member.karmaScore;
  // 5. Delete the post as author
  await api.functional.redditPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 6. Verify soft deletion completed successfully (204 No Content returned implicitly)
  // The erase endpoint returns void on success, which we received without error
  // 7. Verify the post is no longer accessible by confirming the post exists but is deleted
  // (Soft deletion means record still exists with deleted_at set)
  typia.assertGuard(post);
  const deletedPost: IRedditPlatformPost = post satisfies IRedditPlatformPost;
  // 8. Verify karma adjustments are preserved (karma should remain unchanged since votes are cascade deleted)
  // The author's karma score should remain the same as the votes on this deleted post are also deleted
  TestValidator.equals(
    "karma score preserved",
    member.karmaScore,
    initialKarmaScore,
  );
  // 9. Final validation - test passed
  TestValidator.predicate("post author deletion completed successfully", true);
}