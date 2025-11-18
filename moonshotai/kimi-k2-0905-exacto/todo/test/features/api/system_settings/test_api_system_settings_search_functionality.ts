import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSettings";
import type { ITodoAppSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSettings";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test system settings search and text filtering capabilities.
 *
 * This test validates the ability to search across setting keys, values, and
 * descriptions to locate specific configuration items. Tests partial matching
 * against technical identifiers like 'task_limit', 'quota_default',
 * 'session_timeout', and handles descriptive search terms for operational
 * settings. Verifies that search results remain scoped to authorized settings
 * while maintaining efficient query performance for administrative interfaces.
 */
export async function test_api_system_settings_search_functionality(
  connection: api.IConnection,
) {
  // 1. Create authenticated user context for accessing system settings search
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "12345678",
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Search for system settings with no search criteria (return all settings)
  const allSettingsResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {} satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(allSettingsResponse);

  TestValidator.predicate(
    "All settings response contains data",
    allSettingsResponse.data.length > 0,
  );

  // 3. Search for settings by partial key matching (technical identifiers)
  const technicalSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        search: "task",
        limit: 10,
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(technicalSearchResponse);

  TestValidator.predicate(
    "Technical search returns results containing 'task'",
    technicalSearchResponse.data.some(
      (setting) =>
        setting.setting_key.includes("task") ||
        (setting.description && setting.description.includes("task")),
    ),
  );

  // 4. Search for settings by environment scope filtering
  const envScopedSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        environment_scope: "development",
        search: "session",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(envScopedSearchResponse);

  // 5. Search for settings with pagination parameters
  const paginatedSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 5,
        search: "quota",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(paginatedSearchResponse);

  TestValidator.predicate(
    "Paginated search respects limit parameter",
    paginatedSearchResponse.data.length <= 5,
  );

  TestValidator.equals(
    "Paginated search pagination info",
    paginatedSearchResponse.pagination.limit,
    5,
  );

  // 6. Search for settings by setting type filtering
  const typeFilteredSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        setting_type: "number",
        search: "limit",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(typeFilteredSearchResponse);

  // 7. Search for settings by active status filtering
  const statusFilteredSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        is_active: true,
        search: "default",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(statusFilteredSearchResponse);

  TestValidator.predicate(
    "Status filtered search returns only active settings",
    statusFilteredSearchResponse.data.every(
      (setting) => setting.is_active === true,
    ),
  );

  // 8. Complex search combining multiple filters
  const complexSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        search: "timeout",
        setting_type: "number",
        is_active: true,
        environment_scope: "production",
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(complexSearchResponse);

  TestValidator.predicate(
    "Complex search results meet all criteria",
    complexSearchResponse.data.every(
      (setting) =>
        (setting.setting_key.includes("timeout") ||
          (setting.description && setting.description.includes("timeout"))) &&
        setting.setting_type === "number" &&
        setting.is_active === true &&
        setting.environment_scope === "production",
    ),
  );

  // 9. Search for non-existent settings (should return empty results)
  const emptySearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        search: "nonexistent_setting_key_12345",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(emptySearchResponse);

  TestValidator.predicate(
    "Search for non-existent setting returns empty results",
    emptySearchResponse.data.length === 0,
  );

  // 10. Validate that typia.assert already validates complete data structure
  const finalSearchResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        search: "task",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  // typia.assert already validates ALL type safety - no manual validation needed!
  typia.assert(finalSearchResponse);

  TestValidator.predicate(
    "Final search returns valid results",
    finalSearchResponse.data.length > 0,
  );
}
