import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemMetadata";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";

export async function test_api_system_metadata_search_and_filtering(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Test 1: Basic search with default pagination
  const basicResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {} satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(basicResult);

  TestValidator.equals(
    "basic search should return results",
    basicResult.data.length > 0,
    true,
  );
  TestValidator.equals(
    "basic search should have pagination info",
    basicResult.pagination.records >= 0,
    true,
  );

  // Test 2: Search with category filter
  const categoryResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        category: "feature_flags",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(categoryResult);

  // Validate all returned items match the filter
  for (const metadata of categoryResult.data) {
    TestValidator.equals(
      "category filter should match",
      metadata.category,
      "feature_flags",
    );
  }

  // Test 3: Search with environment scope filter
  const environmentResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        environment: "production",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(environmentResult);

  // Validate all returned items match the environment filter
  for (const metadata of environmentResult.data) {
    TestValidator.equals(
      "environment filter should match",
      metadata.environment_scope,
      "production",
    );
  }

  // Test 4: Search with active status filter
  const activeResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        is_active: true,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(activeResult);

  // Validate all returned items are active
  for (const metadata of activeResult.data) {
    TestValidator.equals(
      "active status filter should match",
      metadata.is_active,
      true,
    );
  }

  // Test 5: Search with data type filter
  const dataTypeResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        data_type: "string",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(dataTypeResult);

  // Validate all returned items match the data type
  for (const metadata of dataTypeResult.data) {
    TestValidator.equals(
      "data type filter should match",
      metadata.config_type,
      "string",
    );
  }

  // Test 6: Search with system level filter
  const systemLevelResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        is_system_level: true,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(systemLevelResult);

  // Validate all returned items are system level
  for (const metadata of systemLevelResult.data) {
    TestValidator.equals(
      "system level filter should match",
      metadata.is_system_config,
      true,
    );
  }

  // Test 7: Combined filters test
  const combinedResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        category: "system_limits",
        environment: "development",
        is_active: true,
        data_type: "number",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(combinedResult);

  // Validate all returned items match all filters
  for (const metadata of combinedResult.data) {
    TestValidator.equals(
      "combined category filter should match",
      metadata.category,
      "system_limits",
    );
    TestValidator.equals(
      "combined environment filter should match",
      metadata.environment_scope,
      "development",
    );
    TestValidator.equals(
      "combined active filter should match",
      metadata.is_active,
      true,
    );
    TestValidator.equals(
      "combined data type filter should match",
      metadata.config_type,
      "number",
    );
  }

  // Test 8: Pagination with custom page size
  const paginatedResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit should be respected",
    paginatedResult.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination page should be correct",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records should be correct",
    paginatedResult.pagination.limit,
    5,
  );

  // Test 9: Pagination with second page
  const secondPageResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        limit: 3,
        page: 2,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page should have correct page number",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page should have correct limit",
    secondPageResult.pagination.limit,
    3,
  );

  // Test 10: Sorting by configuration key ascending
  const sortedByKeyAsc: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        order_by: "config_key",
        order_direction: "asc",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(sortedByKeyAsc);

  // Test 11: Sorting by configuration key descending
  const sortedByKeyDesc: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        order_by: "config_key",
        order_direction: "desc",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(sortedByKeyDesc);

  // Test 12: Sorting by category
  const sortedByCategory: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        order_by: "category",
        order_direction: "asc",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(sortedByCategory);

  // Test 13: Partial search functionality
  const searchResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        search: "todo",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(searchResult);

  // Validate search results contain the search term
  for (const metadata of searchResult.data) {
    TestValidator.predicate(
      "search result should contain search term",
      metadata.config_key.toLowerCase().includes("todo"),
    );
  }

  // Test 14: Different search term
  const searchResult2: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        search: "limit",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(searchResult2);

  // Validate search results contain the search term
  for (const metadata of searchResult2.data) {
    TestValidator.predicate(
      "search result should contain search term",
      metadata.config_key.toLowerCase().includes("limit"),
    );
  }

  // Test 15: Maximum pagination limit
  const maxLimitResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        limit: 100,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "max limit should not exceed 100",
    maxLimitResult.data.length <= 100,
    true,
  );

  // Test 16: Sorting by creation date
  const sortedByCreated: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(sortedByCreated);

  // Test 17: Complex search with multiple criteria
  const complexSearchResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        search: "user",
        category: "ui_settings",
        environment: "all",
        is_active: true,
        order_by: "config_key",
        order_direction: "asc",
        limit: 10,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(complexSearchResult);

  // Validate complex search results
  for (const metadata of complexSearchResult.data) {
    TestValidator.predicate(
      "complex search should contain search term",
      metadata.config_key.toLowerCase().includes("user"),
    );
    TestValidator.equals(
      "complex search category should match",
      metadata.category,
      "ui_settings",
    );
    TestValidator.equals(
      "complex search should be active",
      metadata.is_active,
      true,
    );
  }

  TestValidator.equals(
    "complex search should respect limit",
    complexSearchResult.data.length <= 10,
    true,
  );

  // Test 18: Edge case - page beyond available data
  const edgeCaseResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        page: 999999,
        limit: 10,
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(edgeCaseResult);

  TestValidator.equals(
    "edge case should return empty page",
    edgeCaseResult.data.length,
    0,
  );
  TestValidator.equals(
    "edge case should have correct pagination",
    edgeCaseResult.pagination.records >= 0,
    true,
  );

  // Test 19: All filter combinations for inactive items
  const inactiveResult: IPageITodoAppSystemMetadata.ISummary =
    await api.functional.todoApp.admin.system.metadata.index(connection, {
      body: {
        is_active: false,
        data_type: "boolean",
      } satisfies ITodoAppSystemMetadata.IRequest,
    });
  typia.assert(inactiveResult);

  // Validate inactive search results
  for (const metadata of inactiveResult.data) {
    TestValidator.equals(
      "inactive search should return inactive items",
      metadata.is_active,
      false,
    );
    TestValidator.equals(
      "inactive search should filter by data type",
      metadata.config_type,
      "boolean",
    );
  }
}
