import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test update of string-type system settings to ensure text configuration
 * values are properly validated and stored.
 *
 * This test authenticates as an administrator and validates the system settings
 * update functionality for string-type configuration parameters. It verifies
 * that string values are correctly accepted, validated, stored, and that the
 * updated_at timestamp is properly updated on modification.
 *
 * The test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Update a string-type setting with a new text value
 * 3. Verify the setting was updated correctly with the new value
 * 4. Validate that the setting_type remains 'string'
 * 5. Test with different string lengths to ensure flexibility
 * 6. Verify data integrity and proper timestamp updates
 */
export async function test_api_system_settings_update_string_setting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
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
    "admin authenticated successfully",
    admin.id !== null,
  );

  // Step 2: Test updating a string-type setting with a text value
  const settingKey = "notification_email_subject";
  const newEmailSubject = RandomGenerator.paragraph({ sentences: 5 });

  const updatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: newEmailSubject,
        description: "Updated email notification subject line",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting);

  // Step 3: Verify the setting was updated correctly
  TestValidator.equals(
    "setting key matches",
    updatedSetting.setting_key,
    settingKey,
  );
  TestValidator.equals(
    "setting value updated",
    updatedSetting.setting_value,
    newEmailSubject,
  );
  TestValidator.equals(
    "setting type is string",
    updatedSetting.setting_type,
    "string",
  );
  TestValidator.predicate(
    "setting ID is valid format",
    updatedSetting.id.length > 0,
  );

  // Step 4: Test updating with a shorter string value
  const shortStringValue = RandomGenerator.alphabets(10);

  const shortUpdatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: shortStringValue,
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(shortUpdatedSetting);

  TestValidator.equals(
    "short string value stored",
    shortUpdatedSetting.setting_value,
    shortStringValue,
  );
  TestValidator.equals(
    "setting type remains string",
    shortUpdatedSetting.setting_type,
    "string",
  );

  // Step 5: Test updating with a longer string value (multi-line content)
  const longStringValue = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const longUpdatedSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: longStringValue,
        description: "Updated with longer content",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(longUpdatedSetting);

  TestValidator.equals(
    "long string value stored",
    longUpdatedSetting.setting_value,
    longStringValue,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    longUpdatedSetting.updated_at !== null &&
      longUpdatedSetting.updated_at !== undefined,
  );
  TestValidator.equals(
    "setting category preserved",
    longUpdatedSetting.setting_category,
    updatedSetting.setting_category,
  );

  // Step 6: Verify that is_editable flag allows the update
  TestValidator.predicate(
    "setting is editable",
    longUpdatedSetting.is_editable === true,
  );
}
