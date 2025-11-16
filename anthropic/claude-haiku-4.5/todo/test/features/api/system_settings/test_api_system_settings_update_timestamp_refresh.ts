import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test automatic timestamp refresh on system setting updates.
 *
 * This test validates that the updated_at timestamp is automatically refreshed
 * whenever a system setting is modified. The test follows a realistic
 * workflow:
 *
 * 1. Admin authentication to establish admin credentials
 * 2. Perform initial update to a system setting to establish baseline state
 * 3. Capture the updated_at timestamp from the first update
 * 4. Wait briefly to ensure time progression between operations
 * 5. Perform a second update to the same setting with a different value
 * 6. Verify that the second update's updated_at timestamp is newer than the first
 *
 * This ensures that audit timestamps are properly maintained for compliance and
 * tracking purposes, allowing administrators to verify when settings were last
 * modified.
 */
export async function test_api_system_settings_update_timestamp_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
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

  // Step 2: Perform initial update to establish baseline state
  const settingKey = "session_timeout_minutes";
  const firstUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: "30",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(firstUpdate);
  const firstTimestamp = firstUpdate.updated_at;

  // Step 3: Wait briefly to ensure time progression between updates
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Perform second update to the same setting
  const secondUpdate: ITodoAppSystemSetting =
    await api.functional.todoApp.admin.systemSettings.update(connection, {
      settingKey: settingKey,
      body: {
        setting_value: "45",
      } satisfies ITodoAppSystemSetting.IUpdate,
    });
  typia.assert(secondUpdate);
  const secondTimestamp = secondUpdate.updated_at;

  // Step 5: Verify that updated_at timestamp is newer after the second update
  TestValidator.predicate(
    "updated_at timestamp should be newer after setting update",
    new Date(secondTimestamp) > new Date(firstTimestamp),
  );

  // Step 6: Verify setting value was actually updated in the second operation
  TestValidator.equals(
    "setting_value should be updated to new value after second update",
    secondUpdate.setting_value,
    "45",
  );
}
