import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test that attempts to update non-editable system settings are properly
 * rejected.
 *
 * This test validates the access control mechanism that prevents modification
 * of critical system settings marked as non-editable. The scenario:
 *
 * 1. Authenticate as an admin user
 * 2. Attempt to update a system setting marked with is_editable=false
 * 3. Verify that the update operation is rejected with appropriate error
 * 4. Confirm that the setting remains protected from modification
 *
 * This ensures that non-editable settings cannot be modified even by admin
 * users, protecting critical system configuration from accidental or
 * unauthorized changes.
 */
export async function test_api_system_settings_update_non_editable_rejected(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
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
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Attempt to update a non-editable system setting
  // Using a common non-editable setting key (system identifiers are typically non-editable)
  const nonEditableSettingKey = "system_identifier";
  const newSettingValue = RandomGenerator.alphaNumeric(10);

  // Step 3: Verify that the update is rejected
  await TestValidator.error(
    "non-editable system setting update should be rejected",
    async () => {
      await api.functional.todoApp.admin.systemSettings.update(connection, {
        settingKey: nonEditableSettingKey,
        body: {
          setting_value: newSettingValue,
          description: "Attempt to modify non-editable setting",
        } satisfies ITodoAppSystemSetting.IUpdate,
      });
    },
  );

  // Step 4: Confirm the protection by attempting another update on the same setting
  await TestValidator.error(
    "second update attempt on non-editable setting should also be rejected",
    async () => {
      await api.functional.todoApp.admin.systemSettings.update(connection, {
        settingKey: nonEditableSettingKey,
        body: {
          setting_value: RandomGenerator.alphaNumeric(8),
        } satisfies ITodoAppSystemSetting.IUpdate,
      });
    },
  );
}
