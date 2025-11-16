import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user can create and delete their own
 * notification settings record.
 *
 * 1. Register a new user via join (post /auth/user/join)
 * 2. Create a notification settings record for this user (post
 *    /communityPlatform/user/notificationSettings)
 * 3. Delete the notification settings record by ID (delete
 *    /communityPlatform/user/notificationSettings/{notificationSettingsId})
 * 4. Attempt to delete the same record again and expect an error (record not
 *    found)
 * 5. Optionally, attempt to retrieve the deleted record and expect an error
 *    (record not found)
 */
export async function test_api_notification_settings_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(user);

  // 2. Create notification settings
  const createInput = {
    email_notifications_enabled: true,
    push_notifications_enabled: true,
    mentions_alerts_enabled: true,
    activity_notifications_enabled: true,
    moderator_alerts_enabled: false,
  } satisfies ICommunityPlatformNotificationSettings.ICreate;
  const settings: ICommunityPlatformNotificationSettings =
    await api.functional.communityPlatform.user.notificationSettings.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(settings);

  // 3. Delete the notification settings by ID
  await api.functional.communityPlatform.user.notificationSettings.erase(
    connection,
    {
      notificationSettingsId: settings.id,
    },
  );

  // 4. Confirm that deletion is irreversible by attempting to delete again and expecting an error
  await TestValidator.error(
    "double deletion should fail (not found)",
    async () => {
      await api.functional.communityPlatform.user.notificationSettings.erase(
        connection,
        {
          notificationSettingsId: settings.id,
        },
      );
    },
  );

  // 5. Optionally: If there is a read endpoint, attempt to read the deleted settings and expect not found
  // (Not implemented here as read endpoint is not available in the provided API list)
}
