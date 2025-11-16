import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate administrator retrieval of a user's notification settings by
 * internal ID.
 *
 * This test ensures that, given a pre-existing user notification settings
 * record (created by the user-side API), an administrator authenticated actor
 * can fetch the settings by its unique ID using the admin endpoint. The test
 * verifies correct permission flows, the accuracy of the returned data and user
 * summary, and proper context switching between user and admin actors.
 *
 * Steps:
 *
 * 1. Create and authenticate a user account (obtain user's credentials)
 * 2. As the user, create a notification settings record
 * 3. Create and authenticate an administrator account (obtain admin credentials)
 * 4. As the admin, retrieve the notification settings by ID
 * 5. Assert that the retrieved settings match what was created and are linked to
 *    the correct user
 */
export async function test_api_notification_settings_admin_retrieve_detail(
  connection: api.IConnection,
) {
  // 1. Create a user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<string & tags.Format<"password">>();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. Log in as the user (to set context)
  const userLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLogin);

  // 3. As the user, create notification settings
  const settingsRequest = {
    email_notifications_enabled: RandomGenerator.pick([true, false]),
    push_notifications_enabled: RandomGenerator.pick([true, false]),
    mentions_alerts_enabled: RandomGenerator.pick([true, false]),
    activity_notifications_enabled: RandomGenerator.pick([true, false]),
    moderator_alerts_enabled: RandomGenerator.pick([true, false]),
  } satisfies ICommunityPlatformNotificationSettings.ICreate;
  const createdSettings =
    await api.functional.communityPlatform.user.notificationSettings.create(
      connection,
      {
        body: settingsRequest,
      },
    );
  typia.assert(createdSettings);

  // 4. Create and authenticate an administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 5. Admin login (context switch)
  const adminLogin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });
  typia.assert(adminLogin);

  // 6. As the admin, retrieve notification settings by ID
  const retrievedSettings =
    await api.functional.communityPlatform.administrator.notificationSettings.at(
      connection,
      {
        notificationSettingsId: createdSettings.id,
      },
    );
  typia.assert(retrievedSettings);

  // 7. Assert the settings match (business logic)
  TestValidator.equals(
    "notification settings returned by admin match created record",
    {
      email_notifications_enabled:
        retrievedSettings.email_notifications_enabled,
      push_notifications_enabled: retrievedSettings.push_notifications_enabled,
      mentions_alerts_enabled: retrievedSettings.mentions_alerts_enabled,
      activity_notifications_enabled:
        retrievedSettings.activity_notifications_enabled,
      moderator_alerts_enabled: retrievedSettings.moderator_alerts_enabled,
    },
    {
      email_notifications_enabled: settingsRequest.email_notifications_enabled,
      push_notifications_enabled: settingsRequest.push_notifications_enabled,
      mentions_alerts_enabled: settingsRequest.mentions_alerts_enabled,
      activity_notifications_enabled:
        settingsRequest.activity_notifications_enabled,
      moderator_alerts_enabled: settingsRequest.moderator_alerts_enabled,
    },
  );
  // Assert correct user linking
  TestValidator.equals(
    "user summary in retrieved settings matches user's ID",
    retrievedSettings.user.id,
    userJoin.id,
  );
}
