import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscriptionJunction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscriptionJunction";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test subscription notification preference toggle for community subscribers.
 *
 * Validates the complete workflow of enabling/disabling real-time notifications
 * for subscribed communities while maintaining other subscription settings.
 * Tests notification preference changes from enabled to disabled state.
 */
export async function test_api_subscription_notification_toggle(
  connection: api.IConnection,
) {
  // Step 1: Create user account for notification testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: userEmail,
        password: "password123",
        display_name: RandomGenerator.name(1),
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals("user account created", user.id, user.id);

  // Step 2: Create community for notification management testing
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          title: RandomGenerator.name(1),
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
  TestValidator.equals("community created", community.id, community.id);

  // Step 3: Create subscription with notifications enabled
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
  TestValidator.equals(
    "initial subscription created",
    initialSubscription.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "notifications initially enabled",
    initialSubscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "subscription level preserved",
    initialSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "feed weight preserved",
    initialSubscription.feed_weight,
    1.0,
  );

  // Step 4: Toggle notification preference to disabled
  const updatedSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          notification_enabled: false,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  TestValidator.equals(
    "subscription updated",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "notifications now disabled",
    updatedSubscription.notification_enabled,
    false,
  );
  TestValidator.equals(
    "subscription level unchanged",
    updatedSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "feed weight unchanged",
    updatedSubscription.feed_weight,
    1.0,
  );

  // Step 5: Verify notification toggle persistence
  // Toggle back to enabled to verify changes persist
  const reEnabledSubscription: IRedditPlatformCommunitySubscriptionJunction =
    await api.functional.redditPlatform.registeredUser.communities.subscriptions.update(
      connection,
      {
        communityName: community.name,
        userId: user.id,
        body: {
          notification_enabled: true,
        } satisfies IRedditPlatformCommunitySubscriptionJunction.IUpdate,
      },
    );
  typia.assert(reEnabledSubscription);
  TestValidator.equals(
    "notifications re-enabled",
    reEnabledSubscription.notification_enabled,
    true,
  );
  TestValidator.equals(
    "other settings still preserved",
    reEnabledSubscription.subscription_level,
    "full",
  );
  TestValidator.equals(
    "feed weight still preserved",
    reEnabledSubscription.feed_weight,
    1.0,
  );
}
