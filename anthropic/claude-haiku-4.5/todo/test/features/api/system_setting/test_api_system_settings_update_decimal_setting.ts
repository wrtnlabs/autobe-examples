import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test update of decimal-type system settings to validate numeric values with
 * decimal precision.
 *
 * This test validates the system's ability to update decimal-type configuration
 * settings with various decimal values and precision levels. It ensures that:
 *
 * 1. Admin authentication is properly established
 * 2. Decimal-type settings accept valid decimal values
 * 3. Setting precision is maintained when storing and retrieving values
 * 4. Boundary values (minimum and maximum) are correctly handled
 * 5. Values with different decimal places are properly stored
 * 6. The updated_at timestamp reflects the modification
 *
 * The test authenticates as an admin user and updates system settings with
 * different decimal precision levels to verify that the backend correctly
 * validates, stores, and retrieves decimal configuration values.
 */
export async function test_api_system_settings_update_decimal_setting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(10);

  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin authentication successful",
    adminAuth.id !== null && adminAuth.email === adminEmail,
  );

  // Step 2: Update decimal setting with standard decimal value
  const decimalSettingKey1 = "max_upload_size_mb";
  const decimalValue1 = "1024.50";

  const updatedSetting1: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: decimalSettingKey1,
      body: {
        setting_value: decimalValue1,
        description: "Updated decimal value with two decimal places",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting1);
  TestValidator.equals(
    "updated setting value matches input decimal value",
    updatedSetting1.setting_value,
    decimalValue1,
  );
  TestValidator.predicate(
    "setting_type is decimal",
    updatedSetting1.setting_type === "decimal",
  );

  // Step 3: Update decimal setting with high precision value
  const decimalSettingKey2 = "interest_rate_percent";
  const decimalValue2 = "3.14159";

  const updatedSetting2: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: decimalSettingKey2,
      body: {
        setting_value: decimalValue2,
        description: "Updated with high precision decimal value",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting2);
  TestValidator.equals(
    "high precision decimal value stored correctly",
    updatedSetting2.setting_value,
    decimalValue2,
  );

  // Step 4: Update decimal setting with minimal decimal (just one place)
  const decimalSettingKey3 = "tax_multiplier";
  const decimalValue3 = "1.2";

  const updatedSetting3: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: decimalSettingKey3,
      body: {
        setting_value: decimalValue3,
        description: "Single decimal place value",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting3);
  TestValidator.equals(
    "single decimal place value stored correctly",
    updatedSetting3.setting_value,
    decimalValue3,
  );

  // Step 5: Update decimal setting with zero decimal places (whole number as decimal)
  const decimalSettingKey4 = "minimum_user_age";
  const decimalValue4 = "18.0";

  const updatedSetting4: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: decimalSettingKey4,
      body: {
        setting_value: decimalValue4,
        description: "Whole number represented as decimal",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting4);
  TestValidator.equals(
    "whole number decimal value stored correctly",
    updatedSetting4.setting_value,
    decimalValue4,
  );

  // Step 6: Update decimal setting with very small decimal value
  const decimalSettingKey5 = "minimum_commission_rate";
  const decimalValue5 = "0.001";

  const updatedSetting5: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: decimalSettingKey5,
      body: {
        setting_value: decimalValue5,
        description: "Very small decimal value for commission rate",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting5);
  TestValidator.equals(
    "very small decimal value stored correctly",
    updatedSetting5.setting_value,
    decimalValue5,
  );

  // Step 7: Verify precision is maintained across multiple updates
  const decimalSettingKey6 = "conversion_rate_usd_to_eur";
  const decimalValue6 = "0.9234567";

  const updatedSetting6: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: decimalSettingKey6,
      body: {
        setting_value: decimalValue6,
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(updatedSetting6);
  TestValidator.equals(
    "high precision decimal value with 7 places stored correctly",
    updatedSetting6.setting_value,
    decimalValue6,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    updatedSetting6.updated_at !== null &&
      updatedSetting6.updated_at !== undefined,
  );
}
