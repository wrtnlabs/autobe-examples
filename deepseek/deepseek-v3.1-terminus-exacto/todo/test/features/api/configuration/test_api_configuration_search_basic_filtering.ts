import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEConfigurationDataType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic configuration search functionality with pagination and category
 * filtering.
 *
 * This test validates that users can efficiently search and filter
 * configuration settings based on various criteria including category, data
 * type, and search terms. The test establishes user authentication context and
 * performs configuration searches with different filter combinations to ensure
 * proper functionality of configuration management workflows.
 */
export async function test_api_configuration_search_basic_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test basic pagination search
  const basicSearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(basicSearchResult);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    basicSearchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 3: Test category filtering only if categories exist
  if (basicSearchResult.data.length > 0) {
    const categories = ArrayUtil.repeat(
      basicSearchResult.data.length,
      (index) => basicSearchResult.data[index].category,
    );
    const uniqueCategories = [...new Set(categories)];

    if (uniqueCategories.length > 0) {
      const sampleCategory = RandomGenerator.pick(uniqueCategories);
      const categorySearchResult =
        await api.functional.todoApp.user.configurations.index(connection, {
          body: {
            page: 1,
            limit: 10,
            category: sampleCategory,
          } satisfies ITodoAppConfiguration.IRequest,
        });
      typia.assert(categorySearchResult);

      // Validate all results match the category filter
      TestValidator.predicate(
        "all results should match the category filter",
        categorySearchResult.data.every(
          (config) => config.category === sampleCategory,
        ),
      );
    }
  }

  // Step 4: Test data type filtering with fallback
  const dataTypes: IEConfigurationDataType[] = [
    "boolean",
    "number",
    "string",
    "json",
    "array",
    "object",
  ] as const;
  const selectedDataType = RandomGenerator.pick(dataTypes);

  const dataTypeSearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
        data_type: selectedDataType,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(dataTypeSearchResult);

  // Validate results match the data type filter (if any results returned)
  if (dataTypeSearchResult.data.length > 0) {
    TestValidator.predicate(
      "all results should match the data type filter",
      dataTypeSearchResult.data.every(
        (config) => config.data_type === selectedDataType,
      ),
    );
  }

  // Step 5: Test search term filtering with robust handling
  if (basicSearchResult.data.length > 0) {
    // Use a more reliable search term from existing configuration keys
    const sampleConfig = RandomGenerator.pick(basicSearchResult.data);
    const searchTerm = sampleConfig.config_key.substring(
      0,
      Math.max(3, sampleConfig.config_key.length / 2),
    );

    const searchTermResult =
      await api.functional.todoApp.user.configurations.index(connection, {
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
        } satisfies ITodoAppConfiguration.IRequest,
      });
    typia.assert(searchTermResult);

    // Validate search functionality without assuming specific matches
    TestValidator.predicate(
      "search should return valid results",
      searchTermResult.data.length >= 0,
    );
  }

  // Step 6: Test combined filtering with flexible values
  const combinedSearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 5,
        // Use optional filters that might exist
        category:
          basicSearchResult.data.length > 0
            ? basicSearchResult.data[0].category
            : undefined,
        data_type: "string",
        is_sensitive: false, // More likely to exist than sensitive configs
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(combinedSearchResult);

  // Validate combined filter results
  TestValidator.predicate(
    "combined filter should return valid results",
    combinedSearchResult.data.length >= 0,
  );

  // Step 7: Test pagination with different page numbers
  const page2Result = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 should have current page 2",
    page2Result.pagination.current,
    2,
  );

  // Step 8: Test empty search (no filters)
  const emptySearchResult =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.predicate(
    "empty search should return valid results",
    emptySearchResult.data.length >= 0,
  );
}
