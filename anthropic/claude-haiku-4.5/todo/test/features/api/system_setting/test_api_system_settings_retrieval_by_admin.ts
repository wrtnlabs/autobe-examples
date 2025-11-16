import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account for authentication
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
  TestValidator.equals("admin created successfully", admin.email, adminEmail);

  // Step 2: Retrieve system settings using various setting keys
  const settingKeys = [
    "session_timeout_minutes",
    "password_min_length",
    "max_todos_per_user",
  ] as const;

  for (const settingKey of settingKeys) {
    // Retrieve the specific system setting
    const setting: ITodoAppSystemSetting =
      await api.functional.todoApp.admin.systemSettings.at(connection, {
        settingKey,
      });
    typia.assert(setting);

    // Validate the setting contains the requested key
    TestValidator.equals(
      `setting key matches requested key: ${settingKey}`,
      setting.setting_key,
      settingKey,
    );

    // Validate that setting has meaningful values
    TestValidator.predicate(
      `setting_value is not empty for ${settingKey}`,
      setting.setting_value.length > 0,
    );
    TestValidator.predicate(
      `setting_type is not empty for ${settingKey}`,
      setting.setting_type.length > 0,
    );
    TestValidator.predicate(
      `setting_category is not empty for ${settingKey}`,
      setting.setting_category.length > 0,
    );
  }

  // Step 3: Test retrieval with an additional setting to validate consistent behavior
  const additionalSettingKey = "email_notifications_enabled";
  const additionalSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.at(connection, {
      settingKey: additionalSettingKey,
    });
  typia.assert(additionalSetting);

  TestValidator.equals(
    "additional setting key matches",
    additionalSetting.setting_key,
    additionalSettingKey,
  );
  TestValidator.predicate(
    "additional setting has populated value field",
    additionalSetting.setting_value.length > 0,
  );
  TestValidator.predicate(
    "additional setting has populated type field",
    additionalSetting.setting_type.length > 0,
  );
}
