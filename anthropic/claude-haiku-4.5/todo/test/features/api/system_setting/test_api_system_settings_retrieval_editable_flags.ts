import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test retrieval of system settings with different editability flags.
 *
 * This test validates that the system correctly returns the is_editable flag
 * for different system settings, distinguishing between settings that can be
 * modified by administrators and those that are protected from modification.
 *
 * The test flow:
 *
 * 1. Create admin account with authentication credentials
 * 2. Retrieve an editable system setting and verify is_editable is true
 * 3. Retrieve a non-editable system setting and verify is_editable is false
 * 4. Validate that both settings contain complete metadata
 * 5. Verify proper categorization and type information for each setting
 */
export async function test_api_system_settings_retrieval_editable_flags(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Test retrieval of an editable setting
  const editableSettingKey = "max_todos_per_user";
  const editableSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.at(connection, {
      settingKey: editableSettingKey,
    });
  typia.assert(editableSetting);

  // Verify the editable setting has correct editability flag and metadata
  TestValidator.equals(
    "editable setting is_editable flag should be true",
    editableSetting.is_editable,
    true,
  );
  TestValidator.equals(
    "editable setting key should match requested key",
    editableSetting.setting_key,
    editableSettingKey,
  );
  TestValidator.predicate(
    "editable setting should have non-empty setting_value",
    editableSetting.setting_value.length > 0,
  );
  TestValidator.predicate(
    "editable setting should have non-empty setting_type",
    editableSetting.setting_type.length > 0,
  );
  TestValidator.predicate(
    "editable setting should have non-empty setting_category",
    editableSetting.setting_category.length > 0,
  );

  // Step 3: Test retrieval of a non-editable setting
  const nonEditableSettingKey = "system_id";
  const nonEditableSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.at(connection, {
      settingKey: nonEditableSettingKey,
    });
  typia.assert(nonEditableSetting);

  // Verify the non-editable setting has correct editability flag
  TestValidator.equals(
    "non-editable setting is_editable flag should be false",
    nonEditableSetting.is_editable,
    false,
  );
  TestValidator.equals(
    "non-editable setting key should match requested key",
    nonEditableSetting.setting_key,
    nonEditableSettingKey,
  );
  TestValidator.predicate(
    "non-editable setting should have non-empty setting_value",
    nonEditableSetting.setting_value.length > 0,
  );

  // Step 4: Verify both settings contain complete required metadata
  TestValidator.predicate(
    "editable setting should have description",
    editableSetting.description !== undefined,
  );
  TestValidator.predicate(
    "non-editable setting should have created_at timestamp",
    nonEditableSetting.created_at !== undefined,
  );
  TestValidator.predicate(
    "non-editable setting should have updated_at timestamp",
    nonEditableSetting.updated_at !== undefined,
  );

  // Step 5: Verify that is_editable flags distinguish between settings appropriately
  TestValidator.notEquals(
    "editable and non-editable settings should have different is_editable values",
    editableSetting.is_editable,
    nonEditableSetting.is_editable,
  );
}
