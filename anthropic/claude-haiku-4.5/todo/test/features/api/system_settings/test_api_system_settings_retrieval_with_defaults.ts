import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test retrieval of system settings that include default_value fields to verify
 * administrators can see original configuration values for reset purposes.
 *
 * This test validates that administrators can retrieve system settings with
 * default values intact, enabling them to understand the original configuration
 * baseline and reset settings to defaults when needed. The test workflow covers
 * admin authentication, setting retrieval, and comprehensive validation of the
 * setting's properties including the default_value field.
 *
 * 1. Register a new administrator account with email and password
 * 2. Authenticate as admin to obtain JWT tokens
 * 3. Retrieve a specific system setting by its key identifier
 * 4. Validate that the setting includes the default_value property
 * 5. Verify all setting metadata and properties are populated correctly
 * 6. Confirm the setting can be used for reset-to-defaults functionality
 */
export async function test_api_system_settings_retrieval_with_defaults(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

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

  // Validate admin account was created successfully
  TestValidator.equals("admin email matches input", admin.email, adminEmail);

  // Step 2: Retrieve a system setting by key
  // Using a common setting key that systems typically initialize with defaults
  const settingKey = "session_timeout_minutes";

  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.at(connection, {
      settingKey: settingKey,
    });
  typia.assert(setting);

  // Step 3: Validate setting retrieval with correct key
  TestValidator.equals(
    "setting key matches requested key",
    setting.setting_key,
    settingKey,
  );

  // Step 4: Validate that default_value is present and not null
  TestValidator.predicate(
    "default_value property exists and is populated",
    setting.default_value !== undefined &&
      setting.default_value !== null &&
      setting.default_value.length > 0,
  );

  // Step 5: Validate setting_value is populated
  TestValidator.predicate(
    "setting_value is populated",
    setting.setting_value.length > 0,
  );

  // Step 6: Validate setting metadata fields are populated
  TestValidator.predicate(
    "setting_type is populated",
    setting.setting_type.length > 0,
  );
  TestValidator.predicate(
    "setting_category is populated",
    setting.setting_category.length > 0,
  );

  // Step 7: Confirm default_value exists for reset-to-defaults functionality
  // The existence of default_value enables admin to understand original configuration
  TestValidator.predicate(
    "default_value is available for reset operations",
    setting.default_value !== null && setting.default_value !== undefined,
  );

  // Step 8: Validate that setting maintains consistency
  // If setting has a description, it should provide context
  if (setting.description !== undefined && setting.description !== null) {
    TestValidator.predicate(
      "description provides meaningful context",
      setting.description.length > 0,
    );
  }
}
