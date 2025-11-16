import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that an authenticated administrator can delete a user's notification
 * settings record by its ID.
 *
 * Workflow:
 *
 * 1. Register an administrator account and obtain tokens.
 * 2. Register a regular user.
 * 3. As the user, create their notification settings record.
 * 4. Switch back to administrator and delete the user's notification settings
 *    using its id.
 * 5. Confirm that deletion succeeds and no errors are thrown for valid ID and
 *    permission.
 * 6. Attempt deletion with a non-existent notification settings id and assert not
 *    found error is thrown.
 */
export async function test_api_notification_settings_deletion_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register an administrator account and get tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Register a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(15);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 3: Authenticate as user
  const userLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test.com/login",
      referrer: "https://test.com/",
      ip: null,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLogin);

  // Step 4: As user, create notification settings
  const settingsCreate =
    await api.functional.communityPlatform.user.notificationSettings.create(
      connection,
      {
        body: {
          email_notifications_enabled: true,
          push_notifications_enabled: false,
          mentions_alerts_enabled: true,
          activity_notifications_enabled: false,
          moderator_alerts_enabled: true,
        } satisfies ICommunityPlatformNotificationSettings.ICreate,
      },
    );
  typia.assert(settingsCreate);

  // Step 5: Switch back to administrator
  const adminLogin = await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.com/adminlogin",
      referrer: "https://test.com/login",
      ip: null,
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });
  typia.assert(adminLogin);

  // Step 6: As administrator, delete the user's notification settings
  await api.functional.communityPlatform.administrator.notificationSettings.erase(
    connection,
    {
      notificationSettingsId: settingsCreate.id,
    },
  );

  // Step 7: Attempt to delete the same notification settings again (should error)
  await TestValidator.error(
    "Deleting a non-existent (already deleted) notification settings should fail",
    async () => {
      await api.functional.communityPlatform.administrator.notificationSettings.erase(
        connection,
        {
          notificationSettingsId: settingsCreate.id,
        },
      );
    },
  );

  // Step 8: Attempt to delete a totally random notification settings ID (should error)
  await TestValidator.error(
    "Deleting a non-existent notification settings ID should fail",
    async () => {
      await api.functional.communityPlatform.administrator.notificationSettings.erase(
        connection,
        {
          notificationSettingsId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
