import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that member users do not see posts from communities where they are banned.
 *
 * Validates the ban-based post exclusion business logic by creating a member account, creating communities, banning the member from one community, and verifying that when browsing posts, posts from the banned community are excluded from the member's results while posts from other communities remain visible. This ensures that access restrictions enforced by ban status are properly applied at the API level.
 *
 * The test verifies two key scenarios: first, that banned members cannot see posts from communities where they are banned but can still see posts from other communities they are subscribed to. Second, that guest users (unauthenticated) can still see all public posts since ban restrictions only apply to authenticated members.
 *
 * 1. Create member account (banned_user) who will be banned from a community.
 * 2. Create community owner account (owner) who will create communities and issue bans.
 * 3. Owner creates first community (banned_community) where the member will be banned.
 * 4. Owner creates second community (allowed_community) for comparison testing.
 * 5. Both members subscribe to both communities.
 * 6. Create posts in banned_community (should be hidden from banned member).
 * 7. Create posts in allowed_community (should be visible to all members).
 * 8. Owner bans banned_user from banned_community.
 * 9. Banned member browses posts - verify posts from banned_community are excluded.
 * 10. Verify posts from allowed_community are still visible to banned member.
 * 11. Guest user browses posts - verify all public posts are visible (no ban restrictions).
 */
export async function test_api_post_browsing_ban_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create banned member account
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(bannedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(bannedUser);
  // 2. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(owner);
  // 3. Owner creates first community (where ban will apply)
  const bannedCommunity =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<32>>(),
          description: typia.random<string & tags.MaxLength<1000>>(),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(bannedCommunity);
  // 4. Owner creates second community (for comparison)
  const allowedCommunity =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<32>>(),
          description: typia.random<string & tags.MaxLength<1000>>(),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(allowedCommunity);
  // 5. Both members subscribe to both communities
  await generate_random_reddit_community_member_member_subscriptions_create(
    bannedConnection,
    {
      body: {
        community_id: bannedCommunity.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  await generate_random_reddit_community_member_member_subscriptions_create(
    bannedConnection,
    {
      body: {
        community_id: allowedCommunity.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  await generate_random_reddit_community_member_member_subscriptions_create(
    ownerConnection,
    {
      body: {
        community_id: bannedCommunity.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  await generate_random_reddit_community_member_member_subscriptions_create(
    ownerConnection,
    {
      body: {
        community_id: allowedCommunity.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  // 6. Create posts in banned_community
  const bannedCommunityPosts = await ArrayUtil.asyncRepeat(2, async () => {
    const post = await generate_random_reddit_community_posts_create(
      ownerConnection,
      {
        body: {
          community_id: bannedCommunity.id,
          title: typia.random<string & tags.MaxLength<200>>(),
          post_type: "text",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    return post;
  });
  bannedCommunityPosts.forEach((post) => typia.assert(post));
  // 7. Create posts in allowed_community
  const allowedCommunityPosts = await ArrayUtil.asyncRepeat(2, async () => {
    const post = await generate_random_reddit_community_posts_create(
      ownerConnection,
      {
        body: {
          community_id: allowedCommunity.id,
          title: typia.random<string & tags.MaxLength<200>>(),
          post_type: "text",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    return post;
  });
  allowedCommunityPosts.forEach((post) => typia.assert(post));
  // 8. Owner bans banned_user from banned_community
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: bannedCommunity.id },
        body: {
          reddit_community_member_id: bannedUser.id,
          reason: "Test ban for E2E validation",
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 9. Banned member browses posts - verify posts from banned_community are excluded
  const bannedMemberPosts = await api.functional.redditCommunity.posts.index(
    bannedConnection,
    {
      body: {
        sort: "new",
        take: 100,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(bannedMemberPosts);
  // Verify no posts from banned community appear
  const postsFromBannedCommunity = bannedMemberPosts.data.filter(
    (post) => post.community.id === bannedCommunity.id,
  );
  TestValidator.equals(
    "banned member should not see posts from banned community",
    postsFromBannedCommunity.length,
    0,
  );
  // 10. Verify posts from allowed_community are still visible
  const postsFromAllowedCommunity = bannedMemberPosts.data.filter(
    (post) => post.community.id === allowedCommunity.id,
  );
  TestValidator.predicate(
    "banned member should still see posts from allowed community",
    postsFromAllowedCommunity.length > 0,
  );
  // 11. Guest user browses posts - verify all public posts are visible
  const guestConnection: api.IConnection = { host: connection.host };
  const guestPosts = await api.functional.redditCommunity.posts.index(
    guestConnection,
    {
      body: {
        sort: "new",
        take: 100,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(guestPosts);
  // Guest should see posts from both communities (no ban restrictions for guests)
  const guestPostsFromBannedCommunity = guestPosts.data.filter(
    (post) => post.community.id === bannedCommunity.id,
  );
  const guestPostsFromAllowedCommunity = guestPosts.data.filter(
    (post) => post.community.id === allowedCommunity.id,
  );
  TestValidator.predicate(
    "guest should see posts from banned community",
    guestPostsFromBannedCommunity.length > 0,
  );
  TestValidator.predicate(
    "guest should see posts from allowed community",
    guestPostsFromAllowedCommunity.length > 0,
  );
}
