import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test that banned users cannot create comments in the community.
 * Validates ban restrictions prevent comment creation while allowing read access.
 */
export async function test_api_comment_banned_user_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // Step 2: Create community as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Authenticate banned user
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedUserAuth);
  // Step 4: Create a post in the community as owner
  const post = await api.functional.redditPlatform.member.posts.create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        postType: "TEXT" as const,
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Banned user subscribes to the community
  await api.functional.redditPlatform.member.communities.subscribe(
    bannedUserConnection,
    {
      communityId: community.id,
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // Step 6: Owner bans the banned user from the community
  await api.functional.redditPlatform.member.communities.bans.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        user_id: bannedUserAuth.id,
        expires_at: null,
      } satisfies IRedditPlatformCommunityBan.ICreate,
    },
  );
  // Step 7: Attempt to create a comment as banned user (should fail)
  await TestValidator.error("banned user cannot create comment", async () => {
    await api.functional.redditPlatform.member.comments.create(
      bannedUserConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  });
  // Additional verification: Owner can still create comments
  const ownerComment =
    await api.functional.redditPlatform.member.comments.create(
      ownerConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(ownerComment);
}
