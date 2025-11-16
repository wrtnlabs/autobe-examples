import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates new user onboarding and creation of notification settings with full
 * preference control.
 *
 * This scenario:
 *
 * 1. Registers a new user with random valid email and password
 * 2. Ensures authentication context is established (token issuance)
 * 3. Creates first notification settings record for this user with all boolean
 *    preferences provided
 * 4. Checks all setting flags are persisted as input values for this user
 * 5. Attempts duplicate creation, validating refusal via uniqueness constraint
 *    enforcement for notification settings per user
 * 6. Confirms settings cannot be created by an unauthenticated user
 */
export async function test_api_notification_settings_creation_by_new_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const user_email: string = typia.random<string & tags.Format<"email">>();
  const user_password: string = typia.random<
    string & tags.Format<"password">
  >();
  const onboarded: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user_email,
        password: user_password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(onboarded);
  TestValidator.equals(
    "registered email should match",
    onboarded.email,
    user_email,
  );
  TestValidator.equals(
    "user status should be present",
    typeof onboarded.status,
    "string",
  );

  // 2. Prepare notification settings preferences
  const settingsBody = {
    email_notifications_enabled: true,
    push_notifications_enabled: false,
    mentions_alerts_enabled: true,
    activity_notifications_enabled: false,
    moderator_alerts_enabled: true,
  } satisfies ICommunityPlatformNotificationSettings.ICreate;

  // 3. Create notification settings for this user
  const firstSettings: ICommunityPlatformNotificationSettings =
    await api.functional.communityPlatform.user.notificationSettings.create(
      connection,
      {
        body: settingsBody,
      },
    );
  typia.assert(firstSettings);
  TestValidator.equals(
    "settings user id matches onboarded user id",
    firstSettings.user.id,
    onboarded.id,
  );
  TestValidator.equals(
    "persisted email_notifications_enabled",
    firstSettings.email_notifications_enabled,
    settingsBody.email_notifications_enabled,
  );
  TestValidator.equals(
    "persisted push_notifications_enabled",
    firstSettings.push_notifications_enabled,
    settingsBody.push_notifications_enabled,
  );
  TestValidator.equals(
    "persisted mentions_alerts_enabled",
    firstSettings.mentions_alerts_enabled,
    settingsBody.mentions_alerts_enabled,
  );
  TestValidator.equals(
    "persisted activity_notifications_enabled",
    firstSettings.activity_notifications_enabled,
    settingsBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "persisted moderator_alerts_enabled",
    firstSettings.moderator_alerts_enabled,
    settingsBody.moderator_alerts_enabled,
  );

  // 4. Attempt to create duplicate notification settings for same user (must fail)
  await TestValidator.error(
    "duplicate notification settings creation should fail",
    async () => {
      await api.functional.communityPlatform.user.notificationSettings.create(
        connection,
        {
          body: settingsBody,
        },
      );
    },
  );

  // 5. Confirm unauthenticated user cannot create notification settings
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create notification settings",
    async () => {
      await api.functional.communityPlatform.user.notificationSettings.create(
        unauthConn,
        {
          body: settingsBody,
        },
      );
    },
  );
}
