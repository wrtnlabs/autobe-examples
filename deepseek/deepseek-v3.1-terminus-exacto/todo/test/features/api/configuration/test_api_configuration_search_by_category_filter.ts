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
 * Validates configuration search using category-based filtering.
 *
 * This test creates configurations across multiple categories (UI, performance,
 * security, features) and performs category-specific searches to verify
 * accurate filtering. The test ensures that category-based organization
 * supports efficient configuration management and administrative workflows.
 */
export async function test_api_configuration_search_by_category_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user to access configuration management features
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create test configuration entries across multiple categories
  const categories = ["ui", "performance", "security", "features"] as const;
  const createdConfigurations: ITodoListConfiguration[] = [];

  for (const category of categories) {
    const config = await api.functional.todoList.user.configurations.create(
      connection,
      {
        body: {
          key: `${category}.setting.${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          description: `Configuration for ${category} category`,
          category: category,
        } satisfies ITodoListConfiguration.ICreate,
      },
    );
    typia.assert(config);
    createdConfigurations.push(config);
  }

  // Step 3: Test category-based filtering for each category
  for (const category of categories) {
    const searchResult =
      await api.functional.todoList.user.configurations.index(connection, {
        body: {
          category: category,
        } satisfies ITodoListConfiguration.IRequest,
      });
    typia.assert(searchResult);

    // Verify that only configurations from the specified category are returned
    TestValidator.predicate(
      `search results should contain configurations from ${category} category`,
      searchResult.data.every((config) => config.category === category),
    );

    // Verify that all configurations from this category are included
    const expectedConfigs = createdConfigurations.filter(
      (config) => config.category === category,
    );
    TestValidator.equals(
      `number of ${category} configurations should match`,
      searchResult.data.length,
      expectedConfigs.length,
    );

    // Verify configuration IDs match
    const resultIds = searchResult.data.map((config) => config.id).sort();
    const expectedIds = expectedConfigs.map((config) => config.id).sort();
    TestValidator.equals(
      `${category} configuration IDs should match`,
      resultIds,
      expectedIds,
    );
  }

  // Step 4: Test search without category filter (should return all configurations)
  const allConfigsResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        // No category filter - should return all configurations
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(allConfigsResult);

  TestValidator.equals(
    "search without category filter should return all configurations",
    allConfigsResult.data.length,
    createdConfigurations.length,
  );

  // Step 5: Test search with non-existent category
  const nonExistentCategoryResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        category: "nonexistent",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(nonExistentCategoryResult);

  TestValidator.equals(
    "search with non-existent category should return empty results",
    nonExistentCategoryResult.data.length,
    0,
  );

  // Step 6: Test pagination with category filter
  const paginatedResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        category: "ui",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination info should be present in search results",
    paginatedResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination should have valid page information",
    paginatedResult.pagination.current >= 0 &&
      paginatedResult.pagination.limit >= 0 &&
      paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 0,
  );
}
