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
 * Test configuration search with comprehensive pagination functionality.
 *
 * This scenario validates that large configuration sets can be efficiently
 * managed through proper pagination. The test creates multiple configuration
 * entries exceeding the default page size, then performs searches with various
 * filtering parameters to verify correct record counting and data integrity.
 * Validates that the backend's automatic pagination maintains data consistency
 * across multiple requests.
 */
export async function test_api_configuration_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple configuration entries to test pagination
  const configurationCount = 25; // Exceeds typical page size
  const createdConfigurations: ITodoListConfiguration[] = [];

  const categories = ["ui", "performance", "security", "features"] as const;

  for (let i = 0; i < configurationCount; i++) {
    const category = RandomGenerator.pick(categories);
    const config = await api.functional.todoList.user.configurations.create(
      connection,
      {
        body: {
          key: `config.${category}.setting${i}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          description: `Configuration for ${category} category`,
          category: category,
        } satisfies ITodoListConfiguration.ICreate,
      },
    );
    typia.assert(config);
    createdConfigurations.push(config);
  }

  // Step 3: Test search with empty filter (should return all configurations)
  const allConfigsResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {} satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(allConfigsResult);

  // Validate pagination metadata
  TestValidator.equals(
    "total records should match created configurations",
    allConfigsResult.pagination.records,
    configurationCount,
  );
  TestValidator.predicate(
    "current page should be 0 for default request",
    allConfigsResult.pagination.current === 0,
  );
  TestValidator.predicate(
    "page limit should be reasonable",
    allConfigsResult.pagination.limit > 0,
  );
  TestValidator.equals(
    "total pages calculation should be correct",
    allConfigsResult.pagination.pages,
    Math.ceil(
      allConfigsResult.pagination.records / allConfigsResult.pagination.limit,
    ),
  );

  // Step 4: Test pagination with category filtering
  const testCategory = RandomGenerator.pick(categories);
  const categoryResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        category: testCategory,
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(categoryResult);

  // Validate category filtering
  TestValidator.predicate(
    "category filtered results should have correct category",
    categoryResult.data.every((config) => config.category === testCategory),
  );

  // Calculate expected count for this category
  const expectedCategoryCount = createdConfigurations.filter(
    (config) => config.category === testCategory,
  ).length;

  TestValidator.equals(
    "category filtered record count should be correct",
    categoryResult.pagination.records,
    expectedCategoryCount,
  );

  // Step 5: Test pagination with key pattern filtering
  const keyPatternResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        key: "config.ui",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(keyPatternResult);

  // Validate key pattern filtering
  TestValidator.predicate(
    "key pattern filtered results should match pattern",
    keyPatternResult.data.every((config) => config.key.startsWith("config.ui")),
  );

  // Step 6: Test edge case - empty result set with filtering
  const nonExistentCategoryResult =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {
        category: "non-existent-category",
      } satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(nonExistentCategoryResult);

  TestValidator.equals(
    "non-existent category should return empty data",
    nonExistentCategoryResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent category should have zero records",
    nonExistentCategoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent category should have zero pages",
    nonExistentCategoryResult.pagination.pages,
    0,
  );

  // Step 7: Validate data integrity - ensure all created configurations are accessible
  const finalAllConfigs =
    await api.functional.todoList.user.configurations.index(connection, {
      body: {} satisfies ITodoListConfiguration.IRequest,
    });
  typia.assert(finalAllConfigs);

  TestValidator.equals(
    "final record count should remain consistent",
    finalAllConfigs.pagination.records,
    configurationCount,
  );
}
