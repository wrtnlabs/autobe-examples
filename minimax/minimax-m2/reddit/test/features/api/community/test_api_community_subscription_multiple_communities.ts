import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test subscription to multiple communities with varying preferences. Create
 * one user who subscribes to multiple communities with different
 * configurations: public community with full subscription and high feed weight,
 * restricted community with digest subscription and standard weight, and
 * another community with mute subscription but notifications enabled. Validates
 * that users can maintain multiple concurrent subscriptions with different
 * preference sets and feed weighting for personalized content curation.
 */
export async function test_api_community_subscription_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for testing multiple community subscriptions
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: userEmail,
        password: "testpassword123",
        href: "https://example.com/register",
        referrer: "https://google.com",
        display_name: "Test User",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create first community - public community with full subscription potential
  const publicCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "technology",
          title: "Technology Discussion",
          description: "A community for technology enthusiasts",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);

  // Step 3: Create second community - restricted community
  const restrictedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "premium_discussions",
          title: "Premium Discussions",
          description: "A restricted community for premium members only",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(restrictedCommunity);

  // Step 4: Create third community - private community
  const privateCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "exclusive_club",
          title: "Exclusive Club",
          description: "A private community for invited members",
          type: "private",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: true,
          require_post_approval: true,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(privateCommunity);

  // Step 5: Create high-weight full subscription to first community (public)
  const fullSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: publicCommunity.id,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(fullSubscription);

  // Step 6: Create digest subscription to second community (restricted) with standard weight
  const digestSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: restrictedCommunity.id,
        userId: user.id,
        body: {
          subscription_level: "digest",
          notification_enabled: false,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(digestSubscription);

  // Step 7: Create mute subscription with notifications to third community (private)
  const muteSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: privateCommunity.id,
        userId: user.id,
        body: {
          subscription_level: "mute",
          notification_enabled: true,
          feed_weight: 0.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(muteSubscription);

  // Step 8: Validate the multiple subscriptions have correct configurations
  TestValidator.equals(
    "full subscription level for public community",
    fullSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "high feed weight for public community",
    fullSubscription.feed_weight,
    1.5,
  );
  TestValidator.equals(
    "notifications enabled for full subscription",
    fullSubscription.notification_enabled,
    true,
  );

  TestValidator.equals(
    "digest subscription level for restricted community",
    digestSubscription.subscription_level,
    "digest",
  );
  TestValidator.equals(
    "standard feed weight for restricted community",
    digestSubscription.feed_weight,
    1.0,
  );
  TestValidator.equals(
    "notifications disabled for digest subscription",
    digestSubscription.notification_enabled,
    false,
  );

  TestValidator.equals(
    "mute subscription level for private community",
    muteSubscription.subscription_level,
    "mute",
  );
  TestValidator.equals(
    "reduced feed weight for private community",
    muteSubscription.feed_weight,
    0.5,
  );
  TestValidator.equals(
    "notifications enabled for mute subscription",
    muteSubscription.notification_enabled,
    true,
  );

  // Step 9: Validate user can have multiple concurrent subscriptions
  TestValidator.notEquals(
    "different community IDs for subscriptions",
    fullSubscription.reddit_platform_community_id,
    digestSubscription.reddit_platform_community_id,
  );
  TestValidator.notEquals(
    "different community IDs for subscriptions",
    digestSubscription.reddit_platform_community_id,
    muteSubscription.reddit_platform_community_id,
  );
  TestValidator.notEquals(
    "different community IDs for subscriptions",
    fullSubscription.reddit_platform_community_id,
    muteSubscription.reddit_platform_community_id,
  );

  // Step 10: Validate all subscriptions belong to the same user
  TestValidator.equals(
    "all subscriptions belong to same user",
    fullSubscription.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "all subscriptions belong to same user",
    digestSubscription.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "all subscriptions belong to same user",
    muteSubscription.registered_user_id,
    user.id,
  );
}
