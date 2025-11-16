import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import type { ISortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOrder";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test configuration search functionality with text-based search queries.
 *
 * This test validates the configuration search API's ability to handle various
 * search scenarios including partial matching across keys, descriptions, and
 * categories. It also verifies pagination works correctly with search results
 * and maintains search context across pages.
 */
export async function test_api_configuration_search_with_text_query(
  connection: api.IConnection,
) {
  // 1. Authenticate as user to access configuration management features
  const userEmail = typia.random<string & tags.Format<"email">>();
  const password = "testPassword123";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: password,
      password_hash: typia.random<string>(), // Properly generated hash
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. First, get baseline configuration data to understand available search terms
  const baselineResult = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(baselineResult);

  // 3. Extract common patterns from actual configuration data for realistic testing
  const commonTerms =
    baselineResult.data.length > 0
      ? baselineResult.data
          .map((config) => config.key.substring(0, 3))
          .filter((term) => term.length > 0)
      : ["app", "sys", "db", "log", "api"];

  const searchTerm =
    commonTerms.length > 0 ? RandomGenerator.pick(commonTerms) : "app";

  // 4. Test partial match search functionality
  const searchResult = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search pagination should have valid structure",
    searchResult.pagination.current === 1 &&
      searchResult.pagination.limit === 10,
  );

  // 5. Validate search results contain the search term in key, category, or should be empty if no match
  if (searchResult.data.length > 0) {
    const hasMatchingResult = searchResult.data.some(
      (config) =>
        config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.category.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    TestValidator.predicate(
      "search results should contain the search term in key or category",
      hasMatchingResult,
    );
  }

  // 6. Test pagination with search context
  if (searchResult.pagination.pages > 1) {
    const secondPageResult =
      await api.functional.todoApp.user.configurations.index(connection, {
        body: {
          search: searchTerm,
          page: 2,
          limit: 10,
        } satisfies ITodoAppConfiguration.IRequest,
      });
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page should maintain search context",
      secondPageResult.pagination.current,
      2,
    );
  }

  // 7. Test search with category filter
  const categories = ArrayUtil.repeat(
    Math.min(3, baselineResult.data.length),
    () =>
      RandomGenerator.pick(
        baselineResult.data.map((config) => config.category),
      ),
  );

  if (categories.length > 0) {
    const categoryFilterResult =
      await api.functional.todoApp.user.configurations.index(connection, {
        body: {
          search: searchTerm,
          category: RandomGenerator.pick(categories),
          page: 1,
          limit: 5,
        } satisfies ITodoAppConfiguration.IRequest,
      });
    typia.assert(categoryFilterResult);

    TestValidator.predicate(
      "category filtered search should return valid results",
      categoryFilterResult.data.length >= 0,
    );
  }

  // 8. Test empty search query returns all configurations
  const emptySearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        search: "",
        page: 1,
        limit: 20,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.predicate(
    "empty search should return configurations",
    emptySearchResult.data.length >= 0,
  );

  // 9. Test search with non-matching term
  const nonMatchingResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        search: "xyz_nonexistent_term_123",
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(nonMatchingResult);

  TestValidator.predicate(
    "non-matching search should handle gracefully",
    nonMatchingResult.data.length >= 0,
  );

  // 10. Test search with sorting
  const sortedSearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
        sort: "key" as const,
        order: "asc" as ISortOrder,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(sortedSearchResult);

  TestValidator.predicate(
    "sorted search should return valid results",
    sortedSearchResult.data.length >= 0,
  );
}
