import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that a user can update all of their existing notification settings
 * in a single call.
 *
 * Workflow:
 *
 * 1. Register a new user for authentication and create an active session.
 * 2. Create an initial notification settings record for the user, using random
 *    preferences.
 * 3. Update all preference flags through a single PUT operation with new random
 *    values.
 * 4. Validate that ownership is enforced (the authenticated user can update their
 *    own settings).
 * 5. Assert that all updated notification settings are correctly applied in the
 *    system.
 * 6. Confirm audit: updated_at field is changed, created_at remains unchanged,
 *    deleted_at remains null.
 */
export async function test_api_notification_settings_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoin });
  typia.assert(user);

  // 2. Create initial notification settings
  const initialSettingsBody = {
    email_notifications_enabled: true,
    push_notifications_enabled: true,
    mentions_alerts_enabled: false,
    activity_notifications_enabled: false,
    moderator_alerts_enabled: false,
  } satisfies ICommunityPlatformNotificationSettings.ICreate;
  const initialSettings: ICommunityPlatformNotificationSettings =
    await api.functional.communityPlatform.user.notificationSettings.create(
      connection,
      { body: initialSettingsBody },
    );
  typia.assert(initialSettings);

  // 3. Prepare update with all new (toggled) values
  const updateBody = {
    email_notifications_enabled: false,
    push_notifications_enabled: false,
    mentions_alerts_enabled: true,
    activity_notifications_enabled: true,
    moderator_alerts_enabled: true,
  } satisfies ICommunityPlatformNotificationSettings.IUpdate;
  const previousUpdatedAt = initialSettings.updated_at;
  const previousCreatedAt = initialSettings.created_at;

  // 4. Update all preference flags in a single call
  const updated: ICommunityPlatformNotificationSettings =
    await api.functional.communityPlatform.user.notificationSettings.update(
      connection,
      {
        notificationSettingsId: initialSettings.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Ownership: the user must be able to update their own settings
  TestValidator.equals(
    "updated id matches original settings id",
    updated.id,
    initialSettings.id,
  );
  TestValidator.equals(
    "belongs-to user ownership is enforced",
    updated.user.id,
    user.id,
  );

  // 6. Assert all updated notification settings are correctly applied
  TestValidator.equals(
    "email notification flag updated",
    updated.email_notifications_enabled,
    updateBody.email_notifications_enabled,
  );
  TestValidator.equals(
    "push notification flag updated",
    updated.push_notifications_enabled,
    updateBody.push_notifications_enabled,
  );
  TestValidator.equals(
    "mentions alert flag updated",
    updated.mentions_alerts_enabled,
    updateBody.mentions_alerts_enabled,
  );
  TestValidator.equals(
    "activity notification flag updated",
    updated.activity_notifications_enabled,
    updateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "moderator alert flag updated",
    updated.moderator_alerts_enabled,
    updateBody.moderator_alerts_enabled,
  );

  // 7. Validate that updated_at changed, created_at did not, deleted_at is null/undefined
  TestValidator.notEquals(
    "updated_at timestamp should be changed",
    updated.updated_at,
    previousUpdatedAt,
  );
  TestValidator.equals(
    "created_at timestamp remains the same",
    updated.created_at,
    previousCreatedAt,
  );
  TestValidator.equals("deleted_at is still null", updated.deleted_at, null);
}
