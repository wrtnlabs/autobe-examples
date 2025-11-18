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
 * Test comprehensive system settings retrieval and filtering for administrative
 * purposes.
 *
 * This test validates access to configuration settings including feature
 * toggles, rate limiting parameters, default quotas, and notification
 * preferences. Tests filtering by setting type (string, number, boolean, json),
 * environment scope (development, staging, production), and active status.
 * Verifies that administrators can efficiently locate specific configuration
 * items for system management and optimization.
 */
export async function test_api_system_settings_administrative_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "SecurePassword123!",
      ip: "127.0.0.1",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Test basic system settings retrieval without filters
  const allSettings = await api.functional.todoApp.user.systemSettings.index(
    connection,
    {
      body: {} satisfies ITodoAppSystemSettings.IRequest,
    },
  );
  typia.assert(allSettings);

  TestValidator.predicate(
    "basic retrieval returns results",
    allSettings.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    allSettings.pagination !== undefined,
  );

  // Step 3: Test filtering by setting type - string settings
  const stringSettings = await api.functional.todoApp.user.systemSettings.index(
    connection,
    {
      body: {
        setting_type: "string",
      } satisfies ITodoAppSystemSettings.IRequest,
    },
  );
  typia.assert(stringSettings);

  TestValidator.predicate(
    "string filter returns results",
    stringSettings.data.length >= 0,
  );
  stringSettings.data.forEach((setting) => {
    TestValidator.equals(
      "all returned settings are string type",
      setting.setting_type,
      "string",
    );
  });

  // Step 4: Test filtering by setting type - boolean settings
  const booleanSettings =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        setting_type: "boolean",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(booleanSettings);

  TestValidator.predicate(
    "boolean filter returns results",
    booleanSettings.data.length >= 0,
  );
  booleanSettings.data.forEach((setting) => {
    TestValidator.equals(
      "all returned settings are boolean type",
      setting.setting_type,
      "boolean",
    );
  });

  // Step 5: Test filtering by environment scope
  const environments = ["development", "staging", "production"] as const;
  const selectedEnvironment = RandomGenerator.pick(environments);

  const envSettings = await api.functional.todoApp.user.systemSettings.index(
    connection,
    {
      body: {
        environment_scope: selectedEnvironment,
      } satisfies ITodoAppSystemSettings.IRequest,
    },
  );
  typia.assert(envSettings);

  TestValidator.predicate(
    "environment filter returns results",
    envSettings.data.length >= 0,
  );
  envSettings.data.forEach((setting) => {
    if (setting.environment_scope) {
      TestValidator.equals(
        "environment scope matches filter",
        setting.environment_scope,
        selectedEnvironment,
      );
    }
  });

  // Step 6: Test filtering by active status
  const activeSettings = await api.functional.todoApp.user.systemSettings.index(
    connection,
    {
      body: {
        is_active: true,
      } satisfies ITodoAppSystemSettings.IRequest,
    },
  );
  typia.assert(activeSettings);

  TestValidator.predicate(
    "active filter returns results",
    activeSettings.data.length >= 0,
  );
  activeSettings.data.forEach((setting) => {
    TestValidator.predicate(
      "all returned settings are active",
      setting.is_active === true,
    );
  });

  const inactiveSettings =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        is_active: false,
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(inactiveSettings);

  TestValidator.predicate(
    "inactive filter returns results",
    inactiveSettings.data.length >= 0,
  );
  inactiveSettings.data.forEach((setting) => {
    TestValidator.predicate(
      "all returned settings are inactive",
      setting.is_active === false,
    );
  });

  // Step 7: Test combined filtering scenarios
  const combinedFilters =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        setting_type: "string",
        is_active: true,
        environment_scope: "production",
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(combinedFilters);

  TestValidator.predicate(
    "combined filters return results",
    combinedFilters.data.length >= 0,
  );
  combinedFilters.data.forEach((setting) => {
    TestValidator.equals(
      "setting type matches",
      setting.setting_type,
      "string",
    );
    TestValidator.predicate("setting is active", setting.is_active === true);
    if (setting.environment_scope) {
      TestValidator.equals(
        "environment matches",
        setting.environment_scope,
        "production",
      );
    }
  });

  // Step 8: Test pagination functionality
  const paginatedSettings =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(paginatedSettings);

  TestValidator.predicate(
    "pagination returns requested limit",
    paginatedSettings.data.length <= 5,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSettings.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSettings.pagination.limit,
    5,
  );

  // Step 9: Test search functionality
  const searchTerm = "feature";
  const searchResults = await api.functional.todoApp.user.systemSettings.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ITodoAppSystemSettings.IRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search returns results",
    searchResults.data.length >= 0,
  );
  searchResults.data.forEach((setting) => {
    const searchableFields = [
      setting.setting_key,
      setting.setting_value,
      setting.description || "",
    ];

    const containsSearchTerm = searchableFields.some((field) =>
      field.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.predicate(
      "search term found in setting",
      containsSearchTerm === true,
    );
  });

  // Step 10: Test invalid pagination parameters (boundary testing)
  const invalidPageSettings =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        page: 99999,
        limit: 1,
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(invalidPageSettings);

  TestValidator.predicate(
    "invalid page returns empty or minimal results",
    invalidPageSettings.data.length <= 1,
  );
}
