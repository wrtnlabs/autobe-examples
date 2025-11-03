import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user can retrieve notification delivery
 * preferences for a specific community subscription.
 *
 * This test covers the business scenario ensuring that only the subscription
 * owner can access preferences and proper defaults are enforced.
 *
 * Step-by-step:
 *
 * 1. Register a new user (join, receiving JWT and user info).
 * 2. Create a new community (must comply with all constraints).
 * 3. Create a new community subscription for the user, leaving notification
 *    setting as default (should be true = enabled).
 * 4. Retrieve notification preferences for the subscription using the correct
 *    subscriptionId. Assert all fields are correct: user_id, community_id,
 *    enablement, timestamps, etc.
 * 5. Attempt to retrieve notification preferences for an invalid subscriptionId;
 *    expect error.
 */
export async function test_api_user_retrieve_subscription_notification_preferences(
  connection: api.IConnection,
) {
  // 1. Register new user and authenticate
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      href: "https://app.community/latest/register",
      referrer: "https://google.com/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);
  TestValidator.predicate(
    "token.access is string",
    typeof userJoin.token.access === "string",
  );
  TestValidator.predicate(
    "token has expires",
    typeof userJoin.token.expired_at === "string",
  );

  // 2. Create a new community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10).toLowerCase(),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community has valid id",
    typeof community.id === "string",
  );

  // 3. Create a subscription for the user (notification_enabled omitted)
  const subscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Retrieve the notification preferences for the subscription
  const prefs =
    await api.functional.communityPlatform.user.subscriptions.notificationPreferences.at(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(prefs);
  TestValidator.equals(
    "notification_enabled default true",
    prefs.notification_enabled,
    true,
  );
  TestValidator.equals("user_id matches", prefs.user_id, userJoin.id);
  TestValidator.equals(
    "community_id matches",
    prefs.community_id,
    community.id,
  );
  TestValidator.predicate(
    "preferences id is uuid",
    typeof prefs.id === "string" && prefs.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is string",
    typeof prefs.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof prefs.updated_at === "string",
  );

  // 5. Try with a random/invalid subscriptionId (should fail)
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  if (invalidId !== subscription.id) {
    await TestValidator.error(
      "fetching notification preferences for invalid subscription should fail",
      async () => {
        await api.functional.communityPlatform.user.subscriptions.notificationPreferences.at(
          connection,
          { subscriptionId: invalidId },
        );
      },
    );
  }
}
