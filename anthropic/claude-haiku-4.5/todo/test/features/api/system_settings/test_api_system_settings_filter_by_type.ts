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
 * Validates system settings filtering by data type classification.
 *
 * This test verifies that the system settings API correctly filters settings
 * based on their data type. The test:
 *
 * 1. Authenticates as an admin using the join endpoint
 * 2. Queries system settings with different type filters (integer, string,
 *    boolean, decimal)
 * 3. Validates that only settings of the specified type are returned
 * 4. Ensures all returned settings have the correct type value
 * 5. Tests the filter for each valid type enum to ensure comprehensive coverage
 *
 * This ensures administrators can effectively manage and retrieve settings
 * organized by their data type classification.
 */
export async function test_api_system_settings_filter_by_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Test filtering for each setting type
  const settingTypes = ["integer", "string", "boolean", "decimal"] as const;
  const typeFilteredResults: Record<
    string,
    IPageITodoAppSystemSetting.ISummary
  > = {};

  for (const settingType of settingTypes) {
    // Query system settings filtered by type
    const settingsResponse: IPageITodoAppSystemSetting.ISummary =
      await api.functional.todoApp.systemSettings.index(connection, {
        body: {
          setting_type: settingType,
          page: 1,
          limit: 100,
        } satisfies ITodoAppSystemSetting.IRequest,
      });

    typia.assert(settingsResponse);
    typeFilteredResults[settingType] = settingsResponse;

    // Validate pagination info exists
    TestValidator.predicate(
      `pagination current page should be valid for type ${settingType}`,
      settingsResponse.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit should be positive for type ${settingType}`,
      settingsResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      `pagination records should be non-negative for type ${settingType}`,
      settingsResponse.pagination.records >= 0,
    );

    // Validate all returned settings have the correct type
    for (const setting of settingsResponse.data) {
      TestValidator.equals(
        `setting type should match ${settingType} filter`,
        setting.setting_type,
        settingType,
      );
      TestValidator.predicate(
        `setting should have non-empty id for type ${settingType}`,
        setting.id.length > 0,
      );
      TestValidator.predicate(
        `setting should have non-empty setting_key for type ${settingType}`,
        setting.setting_key.length > 0,
      );
    }
  }

  // Step 3: Verify type exclusivity - check that different type filters return different settings
  const integerIds = new Set(
    typeFilteredResults["integer"].data.map((s) => s.id),
  );
  const stringIds = new Set(
    typeFilteredResults["string"].data.map((s) => s.id),
  );
  const booleanIds = new Set(
    typeFilteredResults["boolean"].data.map((s) => s.id),
  );
  const decimalIds = new Set(
    typeFilteredResults["decimal"].data.map((s) => s.id),
  );

  // Verify no overlap between integer and string type results
  const integerStringOverlap = Array.from(integerIds).filter((id) =>
    stringIds.has(id),
  );
  TestValidator.predicate(
    "integer and string type results should not overlap",
    integerStringOverlap.length === 0,
  );

  // Verify no overlap between integer and boolean type results
  const integerBooleanOverlap = Array.from(integerIds).filter((id) =>
    booleanIds.has(id),
  );
  TestValidator.predicate(
    "integer and boolean type results should not overlap",
    integerBooleanOverlap.length === 0,
  );

  // Step 4: Test pagination with type filter
  const integerFirstPage: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_type: "integer",
        page: 1,
        limit: 5,
      } satisfies ITodoAppSystemSetting.IRequest,
    });

  typia.assert(integerFirstPage);
  TestValidator.predicate(
    "first page should have current page = 1",
    integerFirstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should match requested limit",
    integerFirstPage.pagination.limit === 5,
  );

  // Step 5: Test with no type filter to verify filtering mechanism works
  const allSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 1000,
      } satisfies ITodoAppSystemSetting.IRequest,
    });

  typia.assert(allSettings);

  // Calculate total settings across all type filters
  const totalFilteredSettings = settingTypes.reduce(
    (sum, type) => sum + typeFilteredResults[type].data.length,
    0,
  );

  // Verify that sum of type-filtered results doesn't exceed total unfiltered results
  TestValidator.predicate(
    "sum of filtered settings should not exceed total unfiltered settings",
    totalFilteredSettings <= allSettings.data.length,
  );

  // Verify all unfiltered settings match one of the type categories
  for (const setting of allSettings.data) {
    TestValidator.predicate(
      `all settings should have a valid setting_type value`,
      ["integer", "string", "boolean", "decimal"].includes(
        setting.setting_type,
      ),
    );
  }
}
