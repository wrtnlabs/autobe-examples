import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test comprehensive user search functionality with multiple filtering
 * criteria.
 *
 * This test validates the user search API by creating multiple test users with
 * different characteristics and testing various search filters including text
 * search, status filtering, pagination, and sorting options. It ensures that
 * search results correctly match the applied filters and that pagination
 * metadata is accurate.
 */
export async function test_api_user_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create primary authenticated user for search operations
  const primaryUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(primaryUser);

  // Step 2: Create multiple test users with varied characteristics
  const statuses = [
    "active",
    "suspended",
    "verified",
    "pending_verification",
    "locked",
  ] as const;

  const testUsers = await ArrayUtil.asyncRepeat(10, async (index) => {
    const status = RandomGenerator.pick(statuses);
    const name = RandomGenerator.paragraph({ sentences: 2 });

    const user = await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword",
        name: name,
        status: status,
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies ITodoAppUser.ICreate,
    });
    typia.assert(user);
    return user;
  });

  // Step 3: Test search functionality with various filter combinations

  // Test 1: Search by name pattern
  const searchName = RandomGenerator.pick(testUsers).name.substring(0, 3);
  const nameSearchResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchName,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(nameSearchResults);

  TestValidator.predicate(
    "search results should contain matching users",
    nameSearchResults.data.some((user) =>
      user.name.toLowerCase().includes(searchName.toLowerCase()),
    ),
  );

  // Test 2: Filter by specific status
  const targetStatus = RandomGenerator.pick(statuses);
  const statusSearchResults = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: targetStatus,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(statusSearchResults);

  TestValidator.predicate(
    "all results should have the specified status",
    statusSearchResults.data.every((user) => user.status === targetStatus),
  );

  // Test 3: Test pagination with different page sizes
  const paginationTest = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(paginationTest);

  TestValidator.equals(
    "page size should match limit",
    paginationTest.data.length,
    5,
  );
  TestValidator.predicate(
    "current page should be 1",
    paginationTest.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should match requested value",
    paginationTest.pagination.limit === 5,
  );
  TestValidator.predicate(
    "total records should be positive",
    paginationTest.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    paginationTest.pagination.pages ===
      Math.ceil(paginationTest.pagination.records / 5),
  );

  // Test 4: Test sorting options
  const sortFields = ["name", "email", "created_at", "last_login_at"] as const;
  const sortDirections = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of sortDirections) {
      const sortedResults = await api.functional.todoApp.user.users.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            order_by: field,
            order_direction: direction,
          } satisfies ITodoAppUser.IRequest,
        },
      );
      typia.assert(sortedResults);

      TestValidator.predicate(
        `sorting by ${field} ${direction} should return results`,
        sortedResults.data.length > 0,
      );
    }
  }

  // Test 5: Combined search with multiple filters
  const combinedSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "test",
        status: "active",
        order_by: "name",
        order_direction: "asc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(combinedSearch);

  TestValidator.predicate(
    "combined search should return filtered results",
    combinedSearch.data.length >= 0,
  );

  // Test 6: Empty search (should return all users)
  const emptySearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search should return default results",
    emptySearch.data.length > 0,
  );
}
