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
 * Validate the workflow for updating a user's notification preferences for a
 * specific community subscription.
 *
 * Steps:
 *
 * 1. Register user and capture session
 * 2. Create a new community
 * 3. Subscribe user to the new community
 * 4. Update notification preferences to enabled: false, verify response
 * 5. Repeat: Update notification preferences to enabled: true, verify persistence
 * 6. Attempt: Another user tries to update this subscription's notification
 *    preferences (should fail, forbidden)
 */
export async function test_api_user_update_notification_preferences_of_community_subscription(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: "SecretPass123!",
    display_name: RandomGenerator.name(2),
    href: "https://community.test/join",
    referrer: "https://google.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Create a new community
  const communityBody = {
    name: `${RandomGenerator.alphabets(12)}`.toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 4. Update notification preferences to false
  const updateToOff = {
    notification_enabled: false,
  } satisfies ICommunityPlatformCommunitySubscriptionNotifications.IUpdate;
  const updatedOff: ICommunityPlatformCommunitySubscriptionNotifications =
    await api.functional.communityPlatform.user.subscriptions.notificationPreferences.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: updateToOff,
      },
    );
  typia.assert(updatedOff);
  TestValidator.equals(
    "notification preferences off",
    updatedOff.notification_enabled,
    false,
  );
  TestValidator.equals(
    "preference linked to correct user",
    updatedOff.user_id,
    user.id,
  );
  TestValidator.equals(
    "preference linked to correct community",
    updatedOff.community_id,
    community.id,
  );

  // 5. Update notification preferences to true
  const updateToOn = {
    notification_enabled: true,
  } satisfies ICommunityPlatformCommunitySubscriptionNotifications.IUpdate;
  const updatedOn: ICommunityPlatformCommunitySubscriptionNotifications =
    await api.functional.communityPlatform.user.subscriptions.notificationPreferences.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: updateToOn,
      },
    );
  typia.assert(updatedOn);
  TestValidator.equals(
    "notification preferences on",
    updatedOn.notification_enabled,
    true,
  );

  // 6. Create a second user and try updating the first user's subscription (expect failure)
  const email2 = typia.random<string & tags.Format<"email">>();
  const otherJoinBody = {
    email: email2,
    password: "AnotherSecret456!",
    display_name: RandomGenerator.name(2),
    href: "https://community.test/join",
    referrer: "https://bing.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const otherUser: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: otherJoinBody });
  typia.assert(otherUser);

  await TestValidator.error(
    "cannot update another user's notification preferences",
    async () => {
      await api.functional.communityPlatform.user.subscriptions.notificationPreferences.update(
        connection,
        {
          subscriptionId: subscription.id,
          body: { notification_enabled: false },
        },
      );
    },
  );
}
