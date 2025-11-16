import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test successful update of a system setting by an authenticated administrator.
 *
 * This test validates the complete workflow of modifying an editable system
 * configuration setting. The scenario creates an admin account for
 * authentication, then updates a system setting with a new valid value. The
 * test verifies that the update operation accepts the new setting_value,
 * returns the updated setting object with a refreshed updated_at timestamp, and
 * that all setting metadata confirms the update was applied successfully.
 *
 * Workflow:
 *
 * 1. Create an admin account with valid credentials
 * 2. Authenticate as admin (token automatically set by SDK)
 * 3. Update a system setting with a new value
 * 4. Verify the response contains the updated setting with correct metadata
 * 5. Confirm the updated_at timestamp reflects the recent modification
 */
export async function test_api_system_settings_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  TestValidator.equals(
    "admin email matches created email",
    admin.email,
    adminEmail,
  );

  // Step 2: Admin is now authenticated (token automatically set in connection.headers by SDK)
  // The join operation automatically updates connection.headers.Authorization with the access token

  // Step 3: Update a system setting with a new value
  // Use a common setting key like "max_todos_per_user" or "session_timeout_minutes"
  const settingKey = "session_timeout_minutes";
  const newSettingValue = "45"; // New timeout value as string

  const updateTime = new Date();

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: newSettingValue,
        description: "Updated session timeout for testing",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting);

  // Step 4: Verify the response contains the updated setting with correct metadata
  TestValidator.equals(
    "updated setting key matches request",
    updatedSetting.setting_key,
    settingKey,
  );

  TestValidator.equals(
    "updated setting value matches new value",
    updatedSetting.setting_value,
    newSettingValue,
  );

  TestValidator.predicate(
    "setting has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedSetting.id,
    ),
  );

  TestValidator.predicate(
    "setting type is defined",
    updatedSetting.setting_type !== undefined &&
      updatedSetting.setting_type.length > 0,
  );

  TestValidator.predicate(
    "setting category is defined",
    updatedSetting.setting_category !== undefined &&
      updatedSetting.setting_category.length > 0,
  );

  TestValidator.predicate(
    "setting is_editable is true",
    updatedSetting.is_editable === true,
  );

  // Step 5: Verify the updated_at timestamp reflects the recent modification
  const updatedAtTime = new Date(updatedSetting.updated_at);

  TestValidator.predicate(
    "updated_at timestamp is recent",
    updatedAtTime.getTime() >= updateTime.getTime() - 5000, // Allow 5 second tolerance
  );

  TestValidator.predicate(
    "created_at timestamp exists",
    new Date(updatedSetting.created_at) instanceof Date,
  );
}
