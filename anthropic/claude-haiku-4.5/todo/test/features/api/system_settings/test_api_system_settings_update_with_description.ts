import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_update_with_description(
  connection: api.IConnection,
) {
  // Step 1: Register admin account for authentication
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Update system setting WITH description for audit trail documentation
  const settingKeyWithDescription = "password_min_length";
  const newValue = "12";
  const auditDescription =
    "Increased minimum password length for enhanced security compliance with NIST guidelines";

  const updateWithDescription: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKeyWithDescription,
      body: {
        setting_value: newValue,
        description: auditDescription,
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updateWithDescription);

  // Step 3: Verify description was stored
  TestValidator.equals(
    "setting value matches for update with description",
    updateWithDescription.setting_value,
    newValue,
  );
  TestValidator.equals(
    "description is stored in response",
    updateWithDescription.description,
    auditDescription,
  );

  // Step 4: Update system setting WITHOUT description to verify optional parameter
  const settingKeyWithoutDescription = "session_timeout_minutes";
  const newValueNoDesc = "30";

  const updateWithoutDescription: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKeyWithoutDescription,
      body: {
        setting_value: newValueNoDesc,
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updateWithoutDescription);

  // Step 5: Verify update without description works (parameter is optional)
  TestValidator.equals(
    "setting value matches for update without description",
    updateWithoutDescription.setting_value,
    newValueNoDesc,
  );

  // Step 6: Update same setting again with description (description can be added later)
  const laterDescription =
    "Updated to match new organizational security policy";

  const updateWithDescriptionLater: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKeyWithoutDescription,
      body: {
        setting_value: newValueNoDesc,
        description: laterDescription,
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updateWithDescriptionLater);

  // Step 7: Verify description can be added in subsequent updates
  TestValidator.equals(
    "description can be added in subsequent update",
    updateWithDescriptionLater.description,
    laterDescription,
  );

  // Step 8: Verify timestamps are updated properly
  TestValidator.predicate(
    "updated_at timestamp is set for setting with description",
    () => {
      const timestamp = new Date(updateWithDescription.updated_at);
      return !isNaN(timestamp.getTime());
    },
  );

  TestValidator.predicate(
    "updated_at timestamp is set for setting without description",
    () => {
      const timestamp = new Date(updateWithoutDescription.updated_at);
      return !isNaN(timestamp.getTime());
    },
  );
}
