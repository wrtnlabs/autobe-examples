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

export async function test_api_system_configuration_search_by_page(
  connection: api.IConnection,
) {
  // Step 1: User authenticates and joins the system
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple system configuration entries with different value types
  const configurations = await ArrayUtil.asyncRepeat(6, async (index) => {
    const config = await api.functional.todoList.systemConfigurations.create(
      connection,
      {
        body: {
          config_key: `config_${index}_${RandomGenerator.alphaNumeric(4)}`,
          config_value:
            index % 4 === 0
              ? RandomGenerator.alphaNumeric(10)
              : index % 4 === 1
                ? String(RandomGenerator.pick([100, 200, 300, 400, 500]))
                : index % 4 === 2
                  ? String(RandomGenerator.pick([true, false]))
                  : String(Math.random() * 100),
          value_type:
            index % 4 === 0
              ? "string"
              : index % 4 === 1
                ? "integer"
                : index % 4 === 2
                  ? "boolean"
                  : "float",
          description: `Test configuration entry ${index}`,
        } satisfies ITodoListSystemConfig.ICreate,
      },
    );
    typia.assert(config);
    return config;
  });

  // Step 3: Test pagination - first page with limit 2
  const page1: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(page1);

  // Validate pagination metadata for first page
  TestValidator.equals("first page current", page1.pagination.current, 1);
  TestValidator.equals("first page limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "first page has data",
    page1.data.length > 0 && page1.data.length <= 2,
  );
  TestValidator.predicate(
    "first page records count is valid",
    page1.pagination.records >= 6,
  );
  TestValidator.predicate(
    "first page total pages calculated correctly",
    page1.pagination.pages === Math.ceil(page1.pagination.records / 2),
  );

  // Step 4: Test pagination - second page with limit 2
  const page2: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 2,
        limit: 2,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(page2);

  // Validate pagination metadata for second page
  TestValidator.equals("second page current", page2.pagination.current, 2);
  TestValidator.equals("second page limit", page2.pagination.limit, 2);
  TestValidator.predicate(
    "second page has data",
    page2.data.length > 0 && page2.data.length <= 2,
  );
  TestValidator.equals(
    "second page has same total records",
    page1.pagination.records,
    page2.pagination.records,
  );

  // Step 5: Test with different page size - limit 3
  const page1Limit3: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(page1Limit3);

  TestValidator.equals(
    "page with limit 3 - current",
    page1Limit3.pagination.current,
    1,
  );
  TestValidator.equals(
    "page with limit 3 - limit",
    page1Limit3.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "page with limit 3 - correct page size",
    page1Limit3.data.length > 0 && page1Limit3.data.length <= 3,
  );

  // Step 6: Test filtering by value_type - string only
  const stringConfigs: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        value_type: "string",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(stringConfigs);

  // Validate all returned configs are of string type
  TestValidator.predicate(
    "all string configs have correct type",
    stringConfigs.data.every((config) => config.value_type === "string"),
  );

  // Step 7: Test filtering by value_type - integer only
  const integerConfigs: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        value_type: "integer",
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(integerConfigs);

  // Validate all returned configs are of integer type
  TestValidator.predicate(
    "all integer configs have correct type",
    integerConfigs.data.every((config) => config.value_type === "integer"),
  );

  // Step 8: Test search by config_key substring
  if (configurations.length > 0) {
    const firstConfigKey = configurations[0].config_key;
    const searchQuery = firstConfigKey.substring(0, 7); // "config_"

    const searchResults: IPageITodoListSystemConfiguration =
      await api.functional.todoList.user.systemConfigurations.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            search: searchQuery,
          } satisfies ITodoListSystemConfiguration.IRequest,
        },
      );
    typia.assert(searchResults);

    // Validate search results contain matching keys
    TestValidator.predicate(
      "search results contain matching configs",
      searchResults.data.length > 0,
    );
    TestValidator.predicate(
      "all search results match query",
      searchResults.data.every((config) =>
        config.config_key.includes(searchQuery),
      ),
    );
  }

  // Step 9: Verify default sort order (created_at descending)
  const allConfigs: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(allConfigs);

  // Validate that configs are sorted by created_at in descending order
  if (allConfigs.data.length > 1) {
    for (let i = 0; i < allConfigs.data.length - 1; i++) {
      const currentTime = new Date(allConfigs.data[i].created_at).getTime();
      const nextTime = new Date(allConfigs.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `config at index ${i} is created after index ${i + 1}`,
        currentTime >= nextTime,
      );
    }
  }

  // Step 10: Test edge case - page beyond available data
  const pageOutOfRange: IPageITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.index(connection, {
      body: {
        page: 999,
        limit: 10,
      } satisfies ITodoListSystemConfiguration.IRequest,
    });
  typia.assert(pageOutOfRange);

  // Validate empty results for out of range page
  TestValidator.equals(
    "out of range page - current",
    pageOutOfRange.pagination.current,
    999,
  );
  TestValidator.predicate(
    "out of range page - empty data",
    pageOutOfRange.data.length === 0,
  );
}
