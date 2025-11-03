import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates the retrieval of notification preferences for a user's community
 * subscription by an admin.
 *
 * This test covers the full end-user and admin workflow:
 *
 * 1. Register a user (random valid email, password, display_name, href, referrer)
 * 2. As this user, create a new community (random valid name and description)
 * 3. As this user, subscribe to the created community, optionally toggling
 *    notification_enabled
 * 4. Register an admin (random email, password, display_name, href, referrer)
 * 5. As admin, retrieve the subscription notification preferences for the user's
 *    subscription by its id
 *
 * The test asserts:
 *
 * - All intermediary API entities are valid (using typia.assert)
 * - The notification_settings read by admin exactly match the values in the
 *   subscription object
 * - RBAC/ownership is respected (admin can view any user's subscription
 *   preferences)
 */
export async function test_api_admin_retrieve_notification_preferences_of_community_subscription(
  connection: api.IConnection,
) {
  // 1. User register/join
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. User creates a new community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. User subscribes to this community
  const subscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          notification_enabled: true,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Register new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 5. As admin, retrieve notification preferences for user's subscription
  const notificationPreferences =
    await api.functional.communityPlatform.admin.subscriptions.notificationPreferences.at(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(notificationPreferences);

  // Assert notification preferences match the subscription's notification_settings
  TestValidator.equals(
    "notification preferences returned by admin match subscription's notification_settings",
    notificationPreferences,
    subscription.notification_settings,
  );
}
