import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test update validation for integer settings with min_value and max_value
 * constraints.
 *
 * This test authenticates as an admin and validates that integer-type system
 * settings properly enforce their defined boundary constraints during update
 * operations.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin user to obtain authorization
 * 2. Update an integer setting with a valid value within range (should succeed)
 * 3. Update the same setting with the minimum boundary value (should succeed)
 * 4. Update the same setting with the maximum boundary value (should succeed)
 * 5. Attempt to update with a value below minimum boundary (should fail)
 * 6. Attempt to update with a value above maximum boundary (should fail)
 * 7. Verify that validation correctly identifies boundary violations
 */
export async function test_api_system_settings_update_integer_with_bounds(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

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

  // Define test setting key and boundary values for integer validation
  const settingKey = "session_timeout_minutes";
  const minValue = "5";
  const maxValue = "120";
  const validValue = "30";

  // 2. Update setting with a valid value within range (should succeed)
  const validUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: validValue,
        description: "Valid value within range",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(validUpdate);
  TestValidator.equals(
    "setting_value should match valid update",
    validUpdate.setting_value,
    validValue,
  );
  TestValidator.equals(
    "setting_type should be integer",
    validUpdate.setting_type,
    "integer",
  );

  // 3. Update with minimum boundary value (should succeed)
  const minUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: minValue,
        description: "Minimum boundary value",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(minUpdate);
  TestValidator.equals(
    "setting_value should match minimum boundary",
    minUpdate.setting_value,
    minValue,
  );

  // 4. Update with maximum boundary value (should succeed)
  const maxUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: maxValue,
        description: "Maximum boundary value",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(maxUpdate);
  TestValidator.equals(
    "setting_value should match maximum boundary",
    maxUpdate.setting_value,
    maxValue,
  );

  // 5. Attempt to update with value below minimum boundary (should fail)
  await TestValidator.error(
    "update with value below minimum should fail",
    async () => {
      await api.functional.todoApp.admin.systemSettings.update(connection, {
        settingKey: settingKey,
        body: {
          setting_value: "2",
          description: "Value below minimum boundary",
        } satisfies ITodoAppSystemSetting.IUpdate,
      });
    },
  );

  // 6. Attempt to update with value above maximum boundary (should fail)
  await TestValidator.error(
    "update with value above maximum should fail",
    async () => {
      await api.functional.todoApp.admin.systemSettings.update(connection, {
        settingKey: settingKey,
        body: {
          setting_value: "999",
          description: "Value above maximum boundary",
        } satisfies ITodoAppSystemSetting.IUpdate,
      });
    },
  );

  // 7. Verify final state - retrieve the last valid update to confirm persistence
  const finalUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: validValue,
        description: "Final verification update",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(finalUpdate);
  TestValidator.equals(
    "final setting_value should match expected valid value",
    finalUpdate.setting_value,
    validValue,
  );
}
