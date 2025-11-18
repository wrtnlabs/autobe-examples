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

export async function test_api_system_configuration_search_by_key(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphabets(8)}${RandomGenerator.alphaNumeric(4)}`,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create configuration entries with different keys for search testing
  const config1: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "max_todos_per_user",
        config_value: "10000",
        value_type: "integer",
        description: "Maximum number of todos per user",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config1);

  const config2: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "max_message_length",
        config_value: "5000",
        value_type: "integer",
        description: "Maximum message length in characters",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config2);

  const config3: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: "deployment_environment",
        config_value: "production",
        value_type: "string",
        description: "Current deployment environment",
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(config3);

  // Step 3: Search with 'max' substring - should return config1 and config2
  const searchResult1: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "max",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(searchResult1);

  TestValidator.predicate(
    "search results should contain entries matching 'max' substring",
    searchResult1.data.length >= 2,
  );

  const maxMatches = searchResult1.data.filter((config) =>
    config.config_key.toLowerCase().includes("max"),
  );
  TestValidator.equals(
    "all returned configs should have 'max' in key",
    maxMatches.length,
    searchResult1.data.length,
  );

  // Step 4: Verify case-insensitive matching
  const searchResultCaseInsensitive: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "MAX",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(searchResultCaseInsensitive);

  TestValidator.equals(
    "case-insensitive search should return same results",
    searchResult1.data.length,
    searchResultCaseInsensitive.data.length,
  );

  // Step 5: Search with non-matching substring
  const searchNoMatch: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "nonexistent",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(searchNoMatch);

  TestValidator.equals(
    "search with non-matching substring should return empty results",
    searchNoMatch.data.length,
    0,
  );

  // Step 6: Filter by value_type
  const searchByType: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        value_type: "integer",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(searchByType);

  const allIntegerType = searchByType.data.every(
    (config) => config.value_type === "integer",
  );
  TestValidator.predicate(
    "filtered results should all have integer value_type",
    allIntegerType,
  );

  // Step 7: Test pagination
  const page1: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(page1);

  TestValidator.predicate(
    "first page should have items",
    page1.data.length > 0,
  );

  TestValidator.equals(
    "pagination limit should be correctly set",
    page1.pagination.limit,
    2,
  );

  // Step 8: Test sorting by config_key
  const sortedByKey: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "config_key",
        order: "asc",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(sortedByKey);

  // Verify sorting is correct
  for (let i = 1; i < sortedByKey.data.length; i++) {
    TestValidator.predicate(
      `configs at index ${i} should be >= index ${i - 1} in ascending order`,
      sortedByKey.data[i].config_key >= sortedByKey.data[i - 1].config_key,
    );
  }

  // Step 9: Verify response structure integrity
  if (searchResult1.data.length > 0) {
    const sampleConfig = searchResult1.data[0];
    TestValidator.predicate(
      "config should have non-empty id field",
      sampleConfig.id.length > 0,
    );

    TestValidator.predicate(
      "config version should be at least 1",
      sampleConfig.version >= 1,
    );

    TestValidator.predicate(
      "config should have created_at timestamp",
      sampleConfig.created_at !== undefined &&
        sampleConfig.created_at.length > 0,
    );

    TestValidator.predicate(
      "config should have updated_at timestamp",
      sampleConfig.updated_at !== undefined &&
        sampleConfig.updated_at.length > 0,
    );
  }
}
