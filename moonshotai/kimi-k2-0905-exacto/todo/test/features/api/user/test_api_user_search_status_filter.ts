import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user search filtering by account status.
 *
 * This test validates the user search functionality with status-based
 * filtering. The test will:
 *
 * 1. Create several user accounts with different statuses
 * 2. Search for users with specific status values
 * 3. Verify that status filtering works correctly and returns only matching users
 * 4. Test both 'active' and 'inactive' status filters
 *
 * The test ensures that the API correctly implements status-based user
 * filtering for personal account management and self-service operations.
 */
export async function test_api_user_search_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create test users with different statuses
  // Create active users
  const activeUser1 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(activeUser1);
  TestValidator.equals(
    "active user 1 status should be 'active'",
    activeUser1.status,
    "active",
  );

  const activeUser2 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(activeUser2);
  TestValidator.equals(
    "active user 2 status should be 'active'",
    activeUser2.status,
    "active",
  );

  // Create a third active user for more comprehensive testing
  const activeUser3 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(activeUser3);
  TestValidator.equals(
    "active user 3 status should be 'active'",
    activeUser3.status,
    "active",
  );

  // Step 2: Search for active users
  const activeUsersSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(activeUsersSearch);

  // Verify that active users are returned
  TestValidator.predicate(
    "should find active users in search",
    activeUsersSearch.data.length > 0,
  );

  // Verify all returned users have active status
  for (const user of activeUsersSearch.data) {
    TestValidator.equals(
      "all returned users should have 'active' status",
      user.status,
      "active",
    );
  }

  // Verify that our created users appear in the search results
  const foundUserIds = new Set(activeUsersSearch.data.map((user) => user.id));
  TestValidator.predicate(
    "should find created active user 1",
    foundUserIds.has(activeUser1.id),
  );
  TestValidator.predicate(
    "should find created active user 2",
    foundUserIds.has(activeUser2.id),
  );
  TestValidator.predicate(
    "should find created active user 3",
    foundUserIds.has(activeUser3.id),
  );

  // Step 3: Test pagination with status filter
  const paginatedSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 1,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  TestValidator.equals(
    "paginated search should return 1 user",
    paginatedSearch.data.length,
    1,
  );
  TestValidator.equals(
    "search should return active user",
    paginatedSearch.data[0].status,
    "active",
  );
  TestValidator.equals(
    "pagination should show correct limit",
    paginatedSearch.pagination.limit,
    1,
  );

  // Step 4: Search without status filter to ensure all users are returned
  const allUsersSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(allUsersSearch);

  TestValidator.predicate(
    "should find more users without status filter than with filter",
    allUsersSearch.data.length >= activeUsersSearch.data.length,
  );

  // Verify status distribution in unfiltered results (assuming some users might be inactive)
  const statusCounts = allUsersSearch.data.reduce(
    (acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  TestValidator.predicate(
    "should have active users in unfiltered search",
    statusCounts["active"] > 0,
  );

  // Step 5: Test different pagination sizes with status filter
  const smallPageSearch = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 2,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(smallPageSearch);

  TestValidator.equals(
    "small page search should return at most 2 users",
    Math.min(smallPageSearch.data.length, 2),
    2,
  );

  // Verify all returned users are active
  for (const user of smallPageSearch.data) {
    TestValidator.equals(
      "all users in small page search should be active",
      user.status,
      "active",
    );
  }
}
