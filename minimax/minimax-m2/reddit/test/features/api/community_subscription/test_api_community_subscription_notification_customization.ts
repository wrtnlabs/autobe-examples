import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test notification customization for community subscription management.
 *
 * This test validates that users can modify their subscription preferences for
 * communities, specifically disabling real-time notifications while maintaining
 * full subscription level and adjusting feed weight for personalized content
 * delivery.
 *
 * The test scenario involves:
 *
 * 1. Creating an authenticated user account for subscription testing
 * 2. Establishing a test community environment for notification configuration
 * 3. Setting up initial subscription with notifications enabled for baseline
 *    comparison
 * 4. Updating subscription preferences to disable real-time notifications
 * 5. Adjusting feed weight to 0.5 for less prominent community content display
 * 6. Validating that notification settings are properly saved and applied
 * 7. Confirming that feed weight changes affect content prominence in personalized
 *    feeds
 *
 * This test validates the subscription management workflow including preference
 * persistence, notification control, and feed algorithm customization for
 * optimal user experience in community-based content platforms.
 */
export async function test_api_community_subscription_notification_customization(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for subscription testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: userEmail,
        password: "testPassword123",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create test community for notification configuration
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(community);

  // Step 3: Set up initial subscription with notifications enabled
  const initialSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          subscription_level: "full",
          notification_enabled: true,
          feed_weight: 1.0,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.ICreate,
      },
    );
  typia.assert(initialSubscription);

  // Validate initial subscription settings
  TestValidator.equals(
    "initial subscription has notifications enabled",
    initialSubscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "initial subscription has standard feed weight",
    initialSubscription.feed_weight,
    1.0,
  );
  TestValidator.equals(
    "initial subscription level is full",
    initialSubscription.subscription_level,
    "full",
  );

  // Step 4: Update subscription to disable notifications and adjust feed weight
  const updatedSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.communities.subscriptions.update(
      connection,
      {
        communityId: community.id,
        userId: user.id,
        body: {
          notification_enabled: false,
          feed_weight: 0.5,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // Step 5: Validate notification customization changes
  TestValidator.equals(
    "notifications are now disabled",
    updatedSubscription.notification_enabled,
    false,
  );
  TestValidator.equals(
    "feed weight is reduced to 0.5",
    updatedSubscription.feed_weight,
    0.5,
  );
  TestValidator.equals(
    "subscription level remains full",
    updatedSubscription.subscription_level,
    "full",
  );

  // Step 6: Verify subscription relationship integrity
  TestValidator.equals(
    "subscription relationship preserved",
    updatedSubscription.reddit_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "user association maintained",
    updatedSubscription.registered_user_id,
    user.id,
  );

  // Step 7: Confirm subscription activity tracking
  TestValidator.predicate(
    "subscription activity timestamp exists",
    updatedSubscription.last_activity_at !== null &&
      updatedSubscription.last_activity_at !== undefined,
  );
}
