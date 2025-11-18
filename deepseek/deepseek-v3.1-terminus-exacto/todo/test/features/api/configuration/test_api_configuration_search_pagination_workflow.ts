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
 * Validate configuration search pagination workflow with large result sets.
 *
 * This test establishes user authentication context and performs searches with
 * different page sizes and navigation patterns. Validates that pagination
 * metadata (current page, total records, total pages) is accurate and that
 * navigation between pages maintains consistent filtering criteria.
 */
export async function test_api_configuration_search_pagination_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test pagination with different page sizes
  const pageSizes = [10, 25, 50] as const;

  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage = await api.functional.todoApp.user.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies ITodoAppConfiguration.IRequest,
      },
    );
    typia.assert(firstPage);

    // Validate pagination metadata
    TestValidator.equals(
      `page ${pageSize} should start at page 1`,
      firstPage.pagination.current,
      1,
    );
    await TestValidator.predicate(
      `page ${pageSize} should have valid limit`,
      firstPage.pagination.limit === pageSize,
    );
    await TestValidator.predicate(
      `page ${pageSize} should have non-negative total records`,
      firstPage.pagination.records >= 0,
    );
    await TestValidator.predicate(
      `page ${pageSize} should have valid total pages calculation`,
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / pageSize),
    );

    // If there are multiple pages, test navigation
    if (firstPage.pagination.pages > 1) {
      // Test middle page if available
      const middlePageNum = Math.min(2, firstPage.pagination.pages);
      const middlePage = await api.functional.todoApp.user.configurations.index(
        connection,
        {
          body: {
            page: middlePageNum,
            limit: pageSize,
          } satisfies ITodoAppConfiguration.IRequest,
        },
      );
      typia.assert(middlePage);

      TestValidator.equals(
        `middle page ${pageSize} should have correct page number`,
        middlePage.pagination.current,
        middlePageNum,
      );
      TestValidator.equals(
        `middle page ${pageSize} should maintain consistent total records`,
        middlePage.pagination.records,
        firstPage.pagination.records,
      );

      // Test last page
      const lastPage = await api.functional.todoApp.user.configurations.index(
        connection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: pageSize,
          } satisfies ITodoAppConfiguration.IRequest,
        },
      );
      typia.assert(lastPage);

      TestValidator.equals(
        `last page ${pageSize} should have correct page number`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.equals(
        `last page ${pageSize} should maintain consistent total records`,
        lastPage.pagination.records,
        firstPage.pagination.records,
      );
    }
  }

  // Step 3: Test pagination with search filters
  const searchTerm = RandomGenerator.alphabets(5);
  const filteredFirstPage =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: searchTerm,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(filteredFirstPage);

  // If filtered results have multiple pages, verify filter persistence
  if (filteredFirstPage.pagination.pages > 1) {
    const filteredSecondPage =
      await api.functional.todoApp.user.configurations.index(connection, {
        body: {
          page: 2,
          limit: 20,
          search: searchTerm,
        } satisfies ITodoAppConfiguration.IRequest,
      });
    typia.assert(filteredSecondPage);

    TestValidator.equals(
      "filtered pages should maintain consistent total records",
      filteredSecondPage.pagination.records,
      filteredFirstPage.pagination.records,
    );
  }

  // Step 4: Test edge cases
  // Test with maximum page size
  const maxPageSize = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(maxPageSize);

  await TestValidator.predicate(
    "maximum page size should respect limit constraint",
    maxPageSize.pagination.limit <= 100,
  );

  // Test with category filter
  const categoryFiltered =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 15,
        category: "security",
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(categoryFiltered);

  // Step 5: Validate data integrity
  // Ensure all configuration items have required fields
  if (filteredFirstPage.data.length > 0) {
    for (const config of filteredFirstPage.data) {
      await TestValidator.predicate(
        "configuration should have valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          config.id,
        ),
      );
      await TestValidator.predicate(
        "configuration should have config_key",
        config.config_key.length > 0,
      );
      await TestValidator.predicate(
        "configuration should have name",
        config.name.length > 0,
      );
      await TestValidator.predicate(
        "configuration should have category",
        config.category.length > 0,
      );
      await TestValidator.predicate(
        "configuration should have data_type",
        config.data_type.length > 0,
      );
      await TestValidator.predicate(
        "configuration should have valid version number",
        config.version >= 0,
      );
    }
  }

  // Step 6: Test data type filtering
  const dataTypes: IEConfigurationDataType[] = [
    "boolean",
    "number",
    "string",
    "json",
    "array",
    "object",
  ];
  const randomDataType = RandomGenerator.pick(dataTypes);

  const typeFiltered = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        data_type: randomDataType,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(typeFiltered);

  await TestValidator.predicate(
    "data type filtered results should have valid pagination",
    typeFiltered.pagination.records >= 0,
  );

  // Step 7: Test boolean flag filtering
  const booleanFlags = [true, false] as const;
  for (const flag of booleanFlags) {
    const flagFiltered = await api.functional.todoApp.user.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_sensitive: flag,
        } satisfies ITodoAppConfiguration.IRequest,
      },
    );
    typia.assert(flagFiltered);

    await TestValidator.predicate(
      `sensitive flag ${flag} should return valid results`,
      flagFiltered.pagination.records >= 0,
    );
  }
}
