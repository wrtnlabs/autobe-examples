import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test retrieval of system settings across different categories.
 *
 * This test validates that administrators can retrieve system settings from
 * various categories and that each setting contains the correct category
 * classification and data type information. The test creates an admin account,
 * then retrieves settings from different categories (authentication,
 * password_policy, data_management, email_notification, rate_limiting,
 * performance) and verifies:
 *
 * - Each setting has the correct setting_category value
 * - Each setting has the correct setting_type indicator
 * - Settings with different data types (integer, string, boolean, decimal) are
 *   properly returned with accurate type information
 *
 * Process:
 *
 * 1. Create a new administrator account
 * 2. Retrieve system settings from each category and validate organization
 * 3. Verify that setting_category and setting_type are correctly populated
 * 4. Test settings with different data types across categories
 */
export async function test_api_system_settings_retrieval_different_categories(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "secureAdminPassword123!",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== null,
  );

  // Define settings from different categories to test
  const settingCategories = [
    "authentication",
    "password_policy",
    "data_management",
    "email_notification",
    "rate_limiting",
    "performance",
  ] as const;

  // Expected setting keys for each category
  const categorySettingKeys = {
    authentication: "session_timeout_minutes",
    password_policy: "password_min_length",
    data_management: "max_todos_per_user",
    email_notification: "enable_email_notifications",
    rate_limiting: "api_rate_limit_requests_per_minute",
    performance: "cache_ttl_seconds",
  };

  // 2-4. Retrieve and validate settings from each category
  for (const category of settingCategories) {
    const settingKey =
      categorySettingKeys[category as keyof typeof categorySettingKeys];

    const setting: ITodoAppSystemSetting =
      await api.functional.todoApp.admin.systemSettings.at(connection, {
        settingKey,
      });

    typia.assert(setting);

    // Validate that the setting_category matches the expected category
    TestValidator.equals(
      `setting category matches for ${category}`,
      setting.setting_category,
      category,
    );

    // Validate that the setting has a valid setting_type
    TestValidator.predicate(
      `setting_type is valid for ${category}`,
      ["integer", "string", "boolean", "decimal"].includes(
        setting.setting_type,
      ),
    );

    // Validate that the setting_key matches what we requested
    TestValidator.equals(
      `setting_key matches requested key for ${category}`,
      setting.setting_key,
      settingKey,
    );

    // Validate that setting_value is non-empty
    TestValidator.predicate(
      `setting_value is non-empty for ${category}`,
      setting.setting_value.length > 0,
    );
  }
}
