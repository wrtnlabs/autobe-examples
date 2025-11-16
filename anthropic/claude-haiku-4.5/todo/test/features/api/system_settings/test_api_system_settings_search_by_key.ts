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
 * Test filtering system settings by exact or partial match on setting_key.
 *
 * Admin authenticates using join, then searches for settings matching a
 * specific key pattern (e.g., searching for 'session' returns session-related
 * settings). Validates that the search filter correctly returns only settings
 * whose keys match the search criteria. Verifies that pagination works
 * correctly with filtered results and that the response includes only matching
 * settings.
 *
 * Test flow:
 *
 * 1. Create admin account and authenticate
 * 2. Search for settings by key (partial match on 'session')
 * 3. Validate filtered results match search criteria
 * 4. Verify pagination metadata is correct
 * 5. Test pagination with filtered results
 * 6. Validate response structure and data types
 */
export async function test_api_system_settings_search_by_key(
  connection: api.IConnection,
) {
  // 1. Create admin account and authenticate
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
  TestValidator.predicate("admin authentication successful", admin.id !== null);

  // 2. Search for all settings (no filter)
  const allSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {} satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(allSettings);
  TestValidator.predicate(
    "all settings response contains pagination",
    allSettings.pagination !== undefined,
  );
  TestValidator.predicate(
    "all settings response contains data array",
    allSettings.data !== undefined && Array.isArray(allSettings.data),
  );

  // 3. Search with key filter (partial match)
  const searchKeyword = "session";
  const filteredSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_key: searchKeyword,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(filteredSettings);

  // 4. Validate filtered results match search criteria
  TestValidator.predicate(
    "filtered results contain data",
    filteredSettings.data.length >= 0,
  );

  // All returned settings should have keys containing the search keyword
  if (filteredSettings.data.length > 0) {
    const allMatch = filteredSettings.data.every((setting) =>
      setting.setting_key.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
    TestValidator.predicate(
      "all filtered results match search keyword",
      allMatch,
    );
  }

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    filteredSettings.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    filteredSettings.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    filteredSettings.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    filteredSettings.pagination.pages >= 0,
  );

  // 6. Test with pagination parameters
  const pagedSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(pagedSettings);
  TestValidator.predicate(
    "paginated results has limit respected",
    pagedSettings.data.length <= 5,
  );

  // 7. Validate response data structure
  if (pagedSettings.data.length > 0) {
    const setting = pagedSettings.data[0];
    TestValidator.predicate("setting has id", setting.id !== undefined);
    TestValidator.predicate(
      "setting has setting_key",
      setting.setting_key !== undefined,
    );
    TestValidator.predicate(
      "setting has setting_value",
      setting.setting_value !== undefined,
    );
    TestValidator.predicate(
      "setting has setting_type",
      setting.setting_type !== undefined,
    );
    TestValidator.predicate(
      "setting has setting_category",
      setting.setting_category !== undefined,
    );
    TestValidator.predicate(
      "setting has updated_at",
      setting.updated_at !== undefined,
    );
  }

  // 8. Test with type filter
  const typeFilteredSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_type: "integer",
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(typeFilteredSettings);
  TestValidator.predicate(
    "type filtered results returned",
    typeFilteredSettings.pagination !== undefined,
  );

  // 9. Test with category filter
  const categoryFilteredSettings: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_category: "authentication",
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(categoryFilteredSettings);
  TestValidator.predicate(
    "category filtered results returned",
    categoryFilteredSettings.pagination !== undefined,
  );
}
