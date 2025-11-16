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
 * Test multiple filter parameters combined in a single search query
 *
 * Admin authenticates with join, then searches for settings matching multiple
 * criteria simultaneously. Validates that all specified filters are applied
 * correctly and only settings matching all filter criteria are returned.
 *
 * Test scenarios:
 *
 * 1. Filter by category + type (e.g., authentication settings that are integer
 *    type)
 * 2. Filter by category + date range (e.g., recently modified password_policy
 *    settings)
 * 3. Filter by type + setting_key (e.g., all boolean settings with specific key
 *    pattern)
 * 4. Filter by category + type + date range (complex multi-criteria search)
 * 5. Verify pagination works with combined filters
 */
export async function test_api_system_settings_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

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
    admin.id !== undefined,
  );

  // Step 2: Test combined filter - category + type
  const categoryTypeResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "authentication",
        setting_type: "integer",
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(categoryTypeResult);

  // Verify all returned settings match both category and type filters
  if (categoryTypeResult.data.length > 0) {
    categoryTypeResult.data.forEach((setting) => {
      TestValidator.predicate(
        "authentication settings have correct category",
        setting.setting_category === "authentication",
      );
      TestValidator.predicate(
        "integer type settings have correct type",
        setting.setting_type === "integer",
      );
    });
  }

  // Step 3: Test combined filter - category + date range
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const categoryDateResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "password_policy",
        created_at_from: oneMonthAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(categoryDateResult);

  // Verify category filter is applied
  if (categoryDateResult.data.length > 0) {
    categoryDateResult.data.forEach((setting) => {
      TestValidator.predicate(
        "password_policy settings have correct category",
        setting.setting_category === "password_policy",
      );
    });
  }

  // Step 4: Test combined filter - type + key pattern
  const typeKeyResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_type: "boolean",
        setting_key: "notification",
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(typeKeyResult);

  // Verify type filter is applied
  if (typeKeyResult.data.length > 0) {
    typeKeyResult.data.forEach((setting) => {
      TestValidator.predicate(
        "boolean type settings have correct type",
        setting.setting_type === "boolean",
      );
    });
  }

  // Step 5: Test complex multi-criteria filter - category + type + date range
  const complexResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "performance",
        setting_type: "integer",
        updated_at_from: oneMonthAgo.toISOString(),
        updated_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(complexResult);

  // Verify all filters are applied together
  if (complexResult.data.length > 0) {
    complexResult.data.forEach((setting) => {
      TestValidator.predicate(
        "performance category filter applied in complex search",
        setting.setting_category === "performance",
      );
      TestValidator.predicate(
        "integer type filter applied in complex search",
        setting.setting_type === "integer",
      );
    });
  }

  // Step 6: Test pagination with filters
  const paginatedResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "rate_limiting",
        page: 1,
        limit: 5,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination limit respected with filters",
    paginatedResult.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination current page is correct",
    paginatedResult.pagination.current === 1,
  );

  // Step 7: Test filter with email_notification category
  const emailNotificationResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "email_notification",
        setting_type: "string",
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(emailNotificationResult);

  // Step 8: Test filter with data_management category
  const dataManagementResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "data_management",
        setting_type: "decimal",
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(dataManagementResult);

  // Final validation - verify response structure
  TestValidator.predicate(
    "response includes pagination data",
    categoryTypeResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "response includes settings data array",
    Array.isArray(categoryTypeResult.data),
  );
}
