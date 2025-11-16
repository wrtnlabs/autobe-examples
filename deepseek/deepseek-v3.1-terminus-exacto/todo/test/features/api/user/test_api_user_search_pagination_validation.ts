import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * This E2E test validates pagination functionality in user search operations
 * for the Todo application. The test creates multiple user accounts to generate
 * sufficient data for comprehensive pagination testing. It validates that
 * pagination metadata (current page, total pages, total records) is accurately
 * calculated and returned across various scenarios including first page, middle
 * pages, last page, and boundary conditions. The test also verifies that
 * sorting parameters work correctly in conjunction with pagination to ensure
 * consistent result ordering across pages.
 */
export async function test_api_user_search_pagination_validation(
  connection: api.IConnection,
) {
  // Create multiple test users for pagination testing
  const testUsers: ITodoAppUser.IAuthorized[] = [];

  // Create 15 test users to ensure we have enough data for pagination
  for (let i = 0; i < 15; i++) {
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `password${i}`,
        password_hash: `hashed_password${i}`,
        status: "active" as const,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
        updated_at: new Date(Date.now() + i * 1000).toISOString(),
        deleted_at: undefined,
      } satisfies ITodoAppUser.ICreate,
    });
    typia.assert(user);
    testUsers.push(user);
  }

  // Test 1: Basic pagination with default page size (limit = 10)
  const firstPage = await api.functional.todoApp.user.users.index(connection, {
    body: {
      page: 1,
      limit: 10,
      search: undefined,
      status: undefined,
      order_by: undefined,
      order: undefined,
      created_at_start: undefined,
      created_at_end: undefined,
      updated_at_start: undefined,
      updated_at_end: undefined,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(firstPage);

  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page pagination records should be 15",
    firstPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "first page pagination limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "first page pagination current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page pagination pages should be 2",
    firstPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "first page should have 10 users",
    firstPage.data.length,
    10,
  );

  // Test 2: Second page with remaining users
  const secondPage = await api.functional.todoApp.user.users.index(connection, {
    body: {
      page: 2,
      limit: 10,
      search: undefined,
      status: undefined,
      order_by: undefined,
      order: undefined,
      created_at_start: undefined,
      created_at_end: undefined,
      updated_at_start: undefined,
      updated_at_end: undefined,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(secondPage);

  // Validate pagination metadata for second page
  TestValidator.equals(
    "second page pagination records should be 15",
    secondPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "second page pagination limit should be 10",
    secondPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "second page pagination current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page pagination pages should be 2",
    secondPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "second page should have 5 users",
    secondPage.data.length,
    5,
  );

  // Test 3: Boundary condition - page 3 should be empty
  const thirdPage = await api.functional.todoApp.user.users.index(connection, {
    body: {
      page: 3,
      limit: 10,
      search: undefined,
      status: undefined,
      order_by: undefined,
      order: undefined,
      created_at_start: undefined,
      created_at_end: undefined,
      updated_at_start: undefined,
      updated_at_end: undefined,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(thirdPage);

  // Validate pagination metadata for boundary condition
  TestValidator.equals(
    "third page pagination records should be 15",
    thirdPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "third page pagination limit should be 10",
    thirdPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "third page pagination current should be 3",
    thirdPage.pagination.current,
    3,
  );
  TestValidator.equals(
    "third page pagination pages should be 2",
    thirdPage.pagination.pages,
    2,
  );
  TestValidator.equals("third page should be empty", thirdPage.data.length, 0);

  // Test 4: Custom page size (limit = 5)
  const customLimitPage = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: undefined,
        status: undefined,
        order_by: undefined,
        order: undefined,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(customLimitPage);

  // Validate pagination metadata with custom limit
  TestValidator.equals(
    "custom limit page pagination records should be 15",
    customLimitPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "custom limit page pagination limit should be 5",
    customLimitPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "custom limit page pagination current should be 1",
    customLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit page pagination pages should be 3",
    customLimitPage.pagination.pages,
    3,
  );
  TestValidator.equals(
    "custom limit page should have 5 users",
    customLimitPage.data.length,
    5,
  );

  // Test 5: Sorting by email in ascending order
  const sortedAscPage = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        order_by: "email" as const,
        order: "asc" as const,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(sortedAscPage);

  // Validate that results are sorted by email in ascending order
  await TestValidator.predicate(
    "emails should be sorted in ascending order",
    async () => {
      for (let i = 1; i < sortedAscPage.data.length; i++) {
        if (
          sortedAscPage.data[i - 1].email.localeCompare(
            sortedAscPage.data[i].email,
          ) > 0
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Test 6: Sorting by email in descending order
  const sortedDescPage = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        order_by: "email" as const,
        order: "desc" as const,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(sortedDescPage);

  // Validate that results are sorted by email in descending order
  await TestValidator.predicate(
    "emails should be sorted in descending order",
    async () => {
      for (let i = 1; i < sortedDescPage.data.length; i++) {
        if (
          sortedDescPage.data[i - 1].email.localeCompare(
            sortedDescPage.data[i].email,
          ) < 0
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Test 7: Sorting by creation date
  const sortedByDate = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        order_by: "created_at" as const,
        order: "asc" as const,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(sortedByDate);

  // Validate that results are sorted by creation date
  await TestValidator.predicate(
    "users should be sorted by creation date",
    async () => {
      for (let i = 1; i < sortedByDate.data.length; i++) {
        if (
          sortedByDate.data[i - 1].created_at > sortedByDate.data[i].created_at
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Test 8: Search functionality with valid term
  const searchTerm = testUsers[0].email.substring(0, 5);
  const searchResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
        status: undefined,
        order_by: undefined,
        order: undefined,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResults);

  // Validate that search results contain the search term
  await TestValidator.predicate(
    "search results should contain the search term",
    async () => {
      return searchResults.data.every((user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    },
  );

  // Test 9: Filter by status
  const activeUsers = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: "active" as const,
        order_by: undefined,
        order: undefined,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(activeUsers);

  // Validate that all results have active status
  await TestValidator.predicate(
    "all users should have active status",
    async () => {
      return activeUsers.data.every((user) => user.status === "active");
    },
  );

  // Test 10: Date range filtering
  const startDate = new Date(testUsers[0].created_at).toISOString();
  const endDate = new Date(
    testUsers[testUsers.length - 1].created_at,
  ).toISOString();

  const dateFiltered = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        order_by: undefined,
        order: undefined,
        created_at_start: startDate,
        created_at_end: endDate,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(dateFiltered);

  // Validate that results are within date range
  await TestValidator.predicate(
    "users should be within date range",
    async () => {
      return dateFiltered.data.every((user) => {
        const userDate = new Date(user.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return userDate >= start && userDate <= end;
      });
    },
  );

  // Test 11: Maximum limit validation (limit = 100)
  const maxLimitPage = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        search: undefined,
        status: undefined,
        order_by: undefined,
        order: undefined,
        created_at_start: undefined,
        created_at_end: undefined,
        updated_at_start: undefined,
        updated_at_end: undefined,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  // Validate pagination metadata with maximum limit
  TestValidator.equals(
    "max limit page pagination records should be 15",
    maxLimitPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "max limit page pagination limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit page pagination current should be 1",
    maxLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "max limit page pagination pages should be 1",
    maxLimitPage.pagination.pages,
    1,
  );
  TestValidator.equals(
    "max limit page should have all 15 users",
    maxLimitPage.data.length,
    15,
  );
}
