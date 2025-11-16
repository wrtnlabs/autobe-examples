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
 * Test pagination parameters (page, limit) when retrieving system settings.
 *
 * Admin authenticates with POST /auth/admin/join, then retrieves settings with
 * various page and limit combinations to validate pagination behavior. Tests
 * that limit parameter correctly restricts results per page (1-100 range), page
 * parameter retrieves different pages, and pagination metadata is accurate.
 *
 * Test steps:
 *
 * 1. Admin signs up via POST /auth/admin/join
 * 2. Retrieve settings with limit=10, page=1
 * 3. Retrieve settings with limit=5, page=1 and validate smaller limit
 * 4. Retrieve settings with limit=100, page=1 (maximum limit)
 * 5. Retrieve settings with limit=1 (minimum limit boundary)
 * 6. Retrieve multiple pages and validate page ordering
 * 7. Validate pagination metadata consistency
 */
export async function test_api_system_settings_pagination_limit_and_page(
  connection: api.IConnection,
) {
  // Step 1: Admin signs up
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

  // Step 2: Retrieve settings with default pagination (limit=10, page=1)
  const result1: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(result1);
  TestValidator.equals(
    "pagination metadata page should be 1",
    result1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata limit should be 10",
    result1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    result1.data.length <= 10,
  );

  // Step 3: Retrieve with smaller limit (5)
  const result2: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(result2);
  TestValidator.equals(
    "pagination metadata limit should be 5",
    result2.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data with limit=5 should have fewer or equal items than limit=10",
    result2.data.length <= Math.min(5, result1.data.length),
  );

  // Step 4: Retrieve with maximum limit (100)
  const result3: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(result3);
  TestValidator.equals(
    "pagination metadata limit should be 100",
    result3.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data with limit=100 should have more or equal items",
    result3.data.length >= result1.data.length,
  );

  // Step 5: Retrieve with minimum limit (1)
  const result4: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(result4);
  TestValidator.equals(
    "pagination metadata limit should be 1",
    result4.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data with limit=1 should return exactly 1 item if records exist",
    result4.data.length <= 1,
  );

  // Step 6: Test pagination across multiple pages if records exist
  if (result1.pagination.records > result1.pagination.limit) {
    const result5: IPageITodoAppSystemSetting.ISummary =
      await api.functional.todoApp.systemSettings.index(connection, {
        body: {
          page: 2,
          limit: 10,
        } satisfies ITodoAppSystemSetting.IRequest,
      });
    typia.assert(result5);
    TestValidator.equals(
      "second page current page should be 2",
      result5.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page should have different data than first page",
      result5.data.length === 0 || result5.data[0]?.id !== result1.data[0]?.id,
    );

    // Step 7: Validate pagination metadata consistency
    TestValidator.equals(
      "total records should be same across pages",
      result5.pagination.records,
      result1.pagination.records,
    );
    TestValidator.equals(
      "total pages should match pagination calculation",
      result5.pagination.pages,
      Math.ceil(result1.pagination.records / result1.pagination.limit),
    );
  }

  // Step 8: Validate data structure consistency across all results
  TestValidator.predicate(
    "all settings should have required fields",
    result1.data.every(
      (setting) =>
        setting.id &&
        setting.setting_key &&
        setting.setting_value &&
        setting.setting_type &&
        setting.setting_category &&
        setting.updated_at,
    ),
  );
}
