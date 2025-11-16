import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_update_boolean_setting(
  connection: api.IConnection,
) {
  // Step 1: Create admin authentication required to update system settings
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

  // Step 2: Update boolean setting to true
  const settingKeyTrue = "email_notifications_enabled";
  const updateResponseTrue: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKeyTrue,
      body: {
        setting_value: "true",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updateResponseTrue);
  TestValidator.equals(
    "setting key matches",
    updateResponseTrue.setting_key,
    settingKeyTrue,
  );
  TestValidator.equals(
    "setting value is true",
    updateResponseTrue.setting_value,
    "true",
  );
  TestValidator.equals(
    "setting type is boolean",
    updateResponseTrue.setting_type,
    "boolean",
  );

  // Step 3: Update boolean setting to false
  const updateResponseFalse: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKeyTrue,
      body: {
        setting_value: "false",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updateResponseFalse);
  TestValidator.equals(
    "setting key matches after toggle",
    updateResponseFalse.setting_key,
    settingKeyTrue,
  );
  TestValidator.equals(
    "setting value is false",
    updateResponseFalse.setting_value,
    "false",
  );
  TestValidator.equals(
    "setting type remains boolean",
    updateResponseFalse.setting_type,
    "boolean",
  );

  // Step 4: Toggle back to true to verify state transitions
  const updateResponseToggleBack: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKeyTrue,
      body: {
        setting_value: "true",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updateResponseToggleBack);
  TestValidator.equals(
    "setting toggled back to true",
    updateResponseToggleBack.setting_value,
    "true",
  );

  // Step 5: Verify update timestamp changed
  TestValidator.notEquals(
    "updated_at changed between updates",
    updateResponseTrue.updated_at,
    updateResponseFalse.updated_at,
  );
}
