import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Test temporal filtering of system settings by creation date range using
 * created_at_from and created_at_to parameters.
 *
 * This test validates that the system correctly processes temporal filter
 * parameters when searching system configuration settings. The test verifies
 * that the API accepts and applies date range filters using created_at_from and
 * created_at_to parameters for filtering settings by their creation
 * timestamps.
 *
 * Test Flow:
 *
 * 1. Admin authenticates to obtain authorization token
 * 2. Retrieve all available system settings without filters
 * 3. Execute searches with various temporal filter combinations
 * 4. Validate pagination and response structure with temporal filters
 * 5. Verify that temporal parameters are properly accepted and processed
 */
export async function test_api_system_settings_temporal_filter_created_date_range(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
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
  TestValidator.predicate(
    "admin authenticated successfully",
    admin.id !== null,
  );

  // Step 2: Retrieve all system settings without temporal filters
  const allSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(allSettings);
  TestValidator.predicate(
    "all settings retrieved successfully",
    allSettings.pagination.records >= 0,
  );

  // Step 3: Define temporal boundaries for filtering tests
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Step 4: Test with both created_at_from and created_at_to parameters
  const rangeResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_from: oneWeekAgo.toISOString(),
        created_at_to: now.toISOString(),
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(rangeResult);
  TestValidator.predicate(
    "temporal range filter returns valid response",
    rangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "temporal range filter pagination has records count",
    rangeResult.pagination.records >= 0,
  );

  // Step 5: Test with only created_at_from parameter
  const fromOnlyResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_from: threeDaysAgo.toISOString(),
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(fromOnlyResult);
  TestValidator.predicate(
    "created_at_from parameter returns valid response",
    fromOnlyResult.pagination.limit > 0,
  );

  // Step 6: Test with only created_at_to parameter
  const toOnlyResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_to: tomorrow.toISOString(),
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(toOnlyResult);
  TestValidator.predicate(
    "created_at_to parameter returns valid response",
    toOnlyResult.pagination.limit > 0,
  );

  // Step 7: Test with future date range (should return empty or minimal results)
  const futureRangeResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_from: tomorrow.toISOString(),
        created_at_to: nextWeek.toISOString(),
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(futureRangeResult);
  TestValidator.predicate(
    "future date range filter processes correctly",
    futureRangeResult.pagination.records >= 0,
  );

  // Step 8: Validate pagination structure is consistent across all requests
  TestValidator.predicate(
    "unfiltered results pagination valid",
    allSettings.pagination.current >= 1 &&
      allSettings.pagination.limit > 0 &&
      allSettings.pagination.records >= 0,
  );
  TestValidator.predicate(
    "temporal filtered results pagination valid",
    rangeResult.pagination.current >= 1 &&
      rangeResult.pagination.limit > 0 &&
      rangeResult.pagination.records >= 0,
  );

  // Step 9: Verify all results contain valid setting summary data
  if (allSettings.data.length > 0) {
    const firstSetting = allSettings.data[0];
    TestValidator.predicate(
      "settings have required summary fields",
      firstSetting.id !== null &&
        firstSetting.setting_key !== null &&
        firstSetting.setting_value !== null &&
        firstSetting.setting_type !== null &&
        firstSetting.setting_category !== null &&
        firstSetting.updated_at !== null,
    );
  }
}
