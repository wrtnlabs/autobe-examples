import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test retrieval of system settings with numeric constraints.
 *
 * Validates that system settings used for configuration with boundaries (such
 * as session_timeout_minutes, password_min_length, max_todos_per_user) are
 * correctly returned with their constraint metadata including min_value and
 * max_value properties. These constraints are essential for validating settings
 * when updates are attempted.
 *
 * Steps:
 *
 * 1. Authenticate as administrator to gain system settings access
 * 2. Retrieve a setting with defined numeric constraints
 * 3. Verify constraint metadata is present and valid
 * 4. Confirm min_value and max_value are properly set
 */
export async function test_api_system_settings_retrieval_with_constraints(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "admin authenticated successfully",
    admin.id !== null && admin.id !== undefined,
  );

  // Step 2: Retrieve system setting with constraints
  const settingKey = "session_timeout_minutes";
  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.at(connection, {
      settingKey: settingKey,
    });
  typia.assert(setting);

  // Step 3 & 4: Validate setting structure and constraint metadata
  TestValidator.equals(
    "setting key matches requested",
    setting.setting_key,
    settingKey,
  );
  TestValidator.predicate(
    "setting has UUID id",
    typeof setting.id === "string" && setting.id.length > 0,
  );
  TestValidator.predicate(
    "setting has value",
    typeof setting.setting_value === "string" &&
      setting.setting_value.length > 0,
  );
  TestValidator.predicate(
    "setting has type",
    typeof setting.setting_type === "string" && setting.setting_type.length > 0,
  );
  TestValidator.predicate(
    "setting has category",
    typeof setting.setting_category === "string" &&
      setting.setting_category.length > 0,
  );
  TestValidator.predicate(
    "setting has created_at timestamp",
    typeof setting.created_at === "string",
  );
  TestValidator.predicate(
    "setting has updated_at timestamp",
    typeof setting.updated_at === "string",
  );

  // Validate constraint metadata presence
  TestValidator.predicate(
    "min_value constraint exists",
    setting.min_value !== undefined && setting.min_value !== null,
  );
  TestValidator.predicate(
    "max_value constraint exists",
    setting.max_value !== undefined && setting.max_value !== null,
  );

  // Validate constraint values are numeric strings
  if (setting.min_value !== undefined && setting.min_value !== null) {
    TestValidator.predicate(
      "min_value is numeric string",
      !isNaN(Number(setting.min_value)),
    );
  }
  if (setting.max_value !== undefined && setting.max_value !== null) {
    TestValidator.predicate(
      "max_value is numeric string",
      !isNaN(Number(setting.max_value)),
    );
  }

  // Validate min_value <= max_value when both present
  if (
    setting.min_value !== undefined &&
    setting.max_value !== undefined &&
    setting.min_value !== null &&
    setting.max_value !== null
  ) {
    const minNum = Number(setting.min_value);
    const maxNum = Number(setting.max_value);
    TestValidator.predicate(
      "min_value is less than or equal to max_value",
      minNum <= maxNum,
    );
  }

  // Validate is_editable flag
  TestValidator.predicate(
    "is_editable is boolean",
    typeof setting.is_editable === "boolean",
  );
}
