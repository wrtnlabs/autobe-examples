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
 * Test temporal filtering of system settings by modification date range.
 *
 * This test validates the ability to search system settings using
 * updated_at_from and updated_at_to parameters to find settings modified within
 * a specific date range. This is essential for audit trails and monitoring
 * system configuration changes.
 *
 * Workflow:
 *
 * 1. Admin account creation and authentication
 * 2. Define temporal date range for filtering (recent modifications)
 * 3. Search system settings within the specified update date range
 * 4. Validate pagination information
 * 5. Verify all returned settings have updated_at timestamps within the range
 * 6. Test with different date ranges to ensure filtering works correctly
 */
export async function test_api_system_settings_temporal_filter_updated_date_range(
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
    admin.id !== null && admin.email === adminEmail,
  );

  // Step 2: Define temporal date range for filtering
  // Search for settings modified in the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const updatedAtFrom = thirtyDaysAgo.toISOString();
  const updatedAtTo = now.toISOString();

  TestValidator.predicate(
    "temporal range defined correctly",
    new Date(updatedAtFrom) < new Date(updatedAtTo),
  );

  // Step 3: Search system settings within date range
  const searchResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 50,
        updated_at_from: updatedAtFrom,
        updated_at_to: updatedAtTo,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination information
  TestValidator.predicate(
    "pagination object exists",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate("limit is 50", searchResult.pagination.limit === 50);
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 5: Verify all returned settings have updated_at within range
  TestValidator.predicate(
    "settings array exists",
    searchResult.data !== null && Array.isArray(searchResult.data),
  );

  if (searchResult.data.length > 0) {
    for (const setting of searchResult.data) {
      typia.assert(setting);
      const settingUpdatedAt = new Date(setting.updated_at);
      const fromDate = new Date(updatedAtFrom);
      const toDate = new Date(updatedAtTo);

      TestValidator.predicate(
        `setting ${setting.id} updated_at is within range`,
        settingUpdatedAt >= fromDate && settingUpdatedAt <= toDate,
      );
    }
  }

  // Step 6: Test with a narrower date range (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const narrowUpdatedAtFrom = sevenDaysAgo.toISOString();
  const narrowUpdatedAtTo = now.toISOString();

  const narrowSearchResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
        updated_at_from: narrowUpdatedAtFrom,
        updated_at_to: narrowUpdatedAtTo,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(narrowSearchResult);

  // Verify narrow search results are within the narrower date range
  if (narrowSearchResult.data.length > 0) {
    for (const setting of narrowSearchResult.data) {
      typia.assert(setting);
      const settingUpdatedAt = new Date(setting.updated_at);
      const narrowFromDate = new Date(narrowUpdatedAtFrom);
      const narrowToDate = new Date(narrowUpdatedAtTo);

      TestValidator.predicate(
        `setting ${setting.id} is within narrow date range`,
        settingUpdatedAt >= narrowFromDate && settingUpdatedAt <= narrowToDate,
      );
    }
  }

  // Step 7: Verify that narrow search returns equal or fewer results than broad search
  TestValidator.predicate(
    "narrow date range returns equal or fewer results than broad range",
    narrowSearchResult.pagination.records <= searchResult.pagination.records,
  );
}
