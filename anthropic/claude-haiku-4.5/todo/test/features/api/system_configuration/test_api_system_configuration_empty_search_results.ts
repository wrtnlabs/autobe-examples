import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemConfiguration";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test searching for configuration entries that don't match any criteria.
 *
 * This test verifies that the system configuration search endpoint handles
 * empty result sets gracefully. The scenario includes:
 *
 * 1. User authentication via join endpoint
 * 2. Creation of multiple system configuration entries with different value types
 * 3. Search operations that intentionally return no matches:
 *
 *    - Search for non-existent configuration keys
 *    - Filter by value_type with no matching entries
 * 4. Validation of proper pagination metadata (0 records, 0 pages)
 * 5. Confirmation that data arrays are empty
 */
export async function test_api_system_configuration_empty_search_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple system configuration entries with different types
  const configKey1 = RandomGenerator.alphabets(10);
  const configKey2 = RandomGenerator.alphabets(10);
  const configKey3 = RandomGenerator.alphabets(10);

  const config1: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey1,
        config_value: "1000",
        value_type: "integer",
        description: "Maximum todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config1);

  const config2: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey2,
        config_value: "true",
        value_type: "boolean",
        description: "Feature flag enabled",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config2);

  const config3: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey3,
        config_value: "production",
        value_type: "string",
        description: "Deployment environment",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config3);

  // Step 3: Search for non-existent configuration key
  const nonExistentSearchResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "NonExistentConfigKey12345",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(nonExistentSearchResult);

  // Validate empty search results for non-existent key
  TestValidator.equals(
    "empty search results data array",
    nonExistentSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search results pagination records",
    nonExistentSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search results pagination pages",
    nonExistentSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search results current page",
    nonExistentSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search results limit preserved",
    nonExistentSearchResult.pagination.limit,
    10,
  );

  // Step 4: Filter by value_type with no existing entries
  const floatTypeFilterResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        value_type: "float",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(floatTypeFilterResult);

  // Validate empty filter results
  TestValidator.equals(
    "float type filter empty data array",
    floatTypeFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "float type filter empty records",
    floatTypeFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "float type filter empty pages",
    floatTypeFilterResult.pagination.pages,
    0,
  );

  // Step 5: Search with combination of non-matching criteria
  const combinedSearchResult: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 50,
        search: "NonExistent",
        value_type: "float",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(combinedSearchResult);

  // Validate combined search empty results
  TestValidator.equals(
    "combined search empty data array",
    combinedSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined search empty records",
    combinedSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined search empty pages",
    combinedSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined search pagination limit",
    combinedSearchResult.pagination.limit,
    50,
  );

  // Step 6: Validate that pagination works correctly with empty results
  TestValidator.predicate(
    "empty results have valid pagination structure",
    combinedSearchResult.pagination.current >= 0 &&
      combinedSearchResult.pagination.limit > 0 &&
      combinedSearchResult.pagination.records === 0 &&
      combinedSearchResult.pagination.pages === 0,
  );
}
