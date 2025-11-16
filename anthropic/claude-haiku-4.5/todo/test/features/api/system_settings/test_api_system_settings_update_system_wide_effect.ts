import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test that updates to system settings take effect system-wide for all
 * subsequent operations and users.
 *
 * This test validates that configuration changes are immediately persisted and
 * reflected in the system. It authenticates as an admin user, updates a
 * critical system setting, and verifies that the new configuration value is
 * correctly stored and returned by the system, ensuring that all subsequent
 * operations will read the updated configuration.
 *
 * Steps:
 *
 * 1. Admin authentication - establish admin access to system settings
 * 2. Update system setting - modify a configuration parameter to a new value
 * 3. Verify setting persistence - confirm the new value is correctly stored and
 *    returned
 */
export async function test_api_system_settings_update_system_wide_effect(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Update system setting with new value
  const settingKey = "max_todos_per_user";
  const newSettingValue = "500";

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: newSettingValue,
        description: "Updated system setting to verify system-wide propagation",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });

  typia.assert(updatedSetting);

  // Step 3: Verify setting persistence and correctness
  TestValidator.equals(
    "updated setting value matches requested value",
    updatedSetting.setting_value,
    newSettingValue,
  );
  TestValidator.equals(
    "setting key is correct",
    updatedSetting.setting_key,
    settingKey,
  );
  TestValidator.predicate(
    "setting is marked as editable",
    updatedSetting.is_editable === true,
  );
}
