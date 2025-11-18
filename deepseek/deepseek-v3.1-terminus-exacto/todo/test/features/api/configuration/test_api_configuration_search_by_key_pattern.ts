import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListConfiguration";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test configuration search functionality using key pattern matching.
 *
 * This test validates that users can search for configuration settings using
 * partial key matching, enabling efficient configuration management. The test
 * creates multiple configuration entries with related key patterns, then
 * performs searches using various pattern criteria to verify accurate filtering
 * and pagination. Validates that the search operation correctly returns
 * matching configurations while excluding non-matching entries.
 */
export async function test_api_configuration_search_by_key_pattern(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple configuration entries with hierarchical key patterns
  const configurationKeys = [
    "ui.theme.dark",
    "ui.theme.light",
    "performance.cache.ttl",
    "security.auth.token",
    "security.auth.refresh",
    "database.connection.pool",
  ] as const;

  const configurations = await ArrayUtil.asyncRepeat(
    configurationKeys.length,
    async (index) => {
      const configData = {
        key: configurationKeys[index],
        value: `value_${index}`,
        description: `Configuration for ${configurationKeys[index]}`,
        category: [
          "ui",
          "ui",
          "performance",
          "security",
          "security",
          "database",
        ][index],
      } satisfies ITodoListConfiguration.ICreate;

      const config = await api.functional.todoList.user.configurations.create(
        connection,
        { body: configData },
      );
      typia.assert(config);
      return config;
    },
  );

  // 3. Test exact key matching search
  const exactSearch = await api.functional.todoList.user.configurations.index(
    connection,
    {
      body: {
        key: "ui.theme.dark",
      } satisfies ITodoListConfiguration.IRequest,
    },
  );
  typia.assert(exactSearch);
  TestValidator.equals(
    "exact search returns one result",
    exactSearch.data.length,
    1,
  );
  TestValidator.equals(
    "exact search matches key",
    exactSearch.data[0].key,
    "ui.theme.dark",
  );

  // 4. Test partial key pattern matching (ui theme configurations)
  const uiThemeSearch = await api.functional.todoList.user.configurations.index(
    connection,
    {
      body: {
        key: "ui.theme",
      } satisfies ITodoListConfiguration.IRequest,
    },
  );
  typia.assert(uiThemeSearch);
  TestValidator.equals(
    "ui theme search returns 2 results",
    uiThemeSearch.data.length,
    2,
  );
  TestValidator.predicate(
    "all ui theme results contain 'ui.theme' prefix",
    uiThemeSearch.data.every((config) => config.key.startsWith("ui.theme")),
  );

  // 5. Test partial key pattern matching (security configurations)
  const securitySearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        key: "security",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(securitySearch);
  TestValidator.equals(
    "security search returns 2 results",
    securitySearch.data.length,
    2,
  );
  TestValidator.predicate(
    "all security results contain 'security' prefix",
    securitySearch.data.every((config) => config.key.startsWith("security")),
  );

  // 6. Test pagination functionality
  const paginatedSearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        key: "ui",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page is 0",
    paginatedSearch.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination records count is correct",
    paginatedSearch.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginatedSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is valid",
    paginatedSearch.pagination.pages ===
      Math.ceil(
        paginatedSearch.pagination.records / paginatedSearch.pagination.limit,
      ),
  );

  // 7. Test non-matching key pattern
  const nonMatchingSearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        key: "nonexistent.pattern",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching pattern returns empty results",
    nonMatchingSearch.data.length,
    0,
  );

  // 8. Validate response structure integrity
  TestValidator.predicate(
    "pagination structure is valid",
    paginatedSearch.pagination.current >= 0 &&
      paginatedSearch.pagination.limit > 0 &&
      paginatedSearch.pagination.records >= 0 &&
      paginatedSearch.pagination.pages >= 0,
  );

  // 9. Verify all created configurations can be retrieved individually
  for (const createdConfig of configurations) {
    const individualSearch =
      await api.functional.todoList.user.configurations.index(connection, {
        body: {
          key: createdConfig.key,
        } satisfies ITodoListConfiguration.IRequest,
      });
    typia.assert(individualSearch);
    TestValidator.equals(
      "individual search finds created config",
      individualSearch.data.length,
      1,
    );
    TestValidator.equals(
      "individual search matches key",
      individualSearch.data[0].key,
      createdConfig.key,
    );
    TestValidator.equals(
      "individual search matches value",
      individualSearch.data[0].value,
      createdConfig.value,
    );
  }

  // 10. Test empty key search (should return all configurations)
  const allConfigsSearch =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        key: undefined,
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(allConfigsSearch);
  TestValidator.predicate(
    "empty key search returns multiple configurations",
    allConfigsSearch.data.length >= configurations.length,
  );
}
