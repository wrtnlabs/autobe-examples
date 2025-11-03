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
 * Validate that a user (member) can update notification preferences for their
 * community subscription.
 *
 * The test covers full flow:
 *
 * 1. Register new user (join)
 * 2. Create a new community (as that user)
 * 3. Subscribe to the created community
 * 4. Update the subscription notification preferences to false, validate update
 * 5. Update back to true, validate update
 * 6. Attempt update-to-subscription by another (unauthorized) user and expect
 *    error
 * 7. Attempt update after deleting (simulate by direct soft delete in DB—skipped
 *    here due to no API)
 *
 * All fields and operations are validated for business and ownership rules.
 */
export async function test_api_community_subscription_update_notification_preferences_by_member(
  connection: api.IConnection,
) {
  // 1. Register new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Create community as user
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Subscribe user to the community
  const subscriptionBody = {
    community_id: community.id,
    notification_enabled: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscriptions link community",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "notification enabled after subscribe",
    subscription.notification_settings.notification_enabled,
    true,
  );

  // 4. Update notification_enabled to false
  const updateBody1 = {
    notification_enabled: false,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;
  const updated1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.subscriptions.update(
      connection,
      { subscriptionId: subscription.id, body: updateBody1 },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "notification flag off",
    updated1.notification_settings.notification_enabled,
    false,
  );

  // 5. Update notification_enabled back to true
  const updateBody2 = {
    notification_enabled: true,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;
  const updated2: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.subscriptions.update(
      connection,
      { subscriptionId: subscription.id, body: updateBody2 },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "notification flag restored",
    updated2.notification_settings.notification_enabled,
    true,
  );

  // 6. Register another user for unauthorized test
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const otherUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody2 });
  typia.assert(otherUser);
  // At this point connection's Authorization header is the new user's token

  // Attempting update as non-owner should result in error
  await TestValidator.error("only owner can update subscription", async () => {
    await api.functional.communityPlatform.user.subscriptions.update(
      connection,
      { subscriptionId: subscription.id, body: updateBody1 },
    );
  });

  // (Skipped: test updating a deleted subscription - as there is no delete endpoint exposed here)
}
