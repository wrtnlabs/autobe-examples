import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user search functionality with status filtering.
 *
 * This test validates that the user search API works correctly with status
 * parameters. Since user registration automatically sets status to 'active',
 * this test focuses on filtering active users and testing the search
 * functionality with realistic parameters.
 */
export async function test_api_user_search_by_status(
  connection: api.IConnection,
) {
  // 1. Create authenticated user context for search operations
  const authUserEmail = typia.random<string & tags.Format<"email">>();
  const authUser = await api.functional.auth.user.join(connection, {
    body: {
      email: authUserEmail,
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authUser);

  // 2. Set up system configuration for user management
  const config = await api.functional.todoList.user.configurations.create(
    connection,
    {
      body: {
        key: "user.search.enabled",
        value: "true",
        description: "Enable user search functionality",
        category: "features",
      } satisfies ITodoListConfiguration.ICreate,
    },
  );
  typia.assert(config);

  // 3. Create test users (all will have 'active' status by default)
  const testUsers: ITodoListUser.IAuthorized[] = [];

  for (let i = 0; i < 3; i++) {
    const testUserEmail = typia.random<string & tags.Format<"email">>();
    const testUser = await api.functional.auth.user.join(connection, {
      body: {
        email: testUserEmail,
        password: "testpass123",
      } satisfies ITodoListUser.ICreate,
    });
    typia.assert(testUser);
    testUsers.push(testUser);
  }

  // 4. Test filtering by 'active' status (the only status available)
  const activeUsersResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(activeUsersResult);

  // Verify all returned users have 'active' status
  TestValidator.predicate(
    "all users should have active status when filtering by active",
    activeUsersResult.data.every((user) => user.status === "active"),
  );

  // 5. Test empty status parameter returns all users
  const allUsersResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(allUsersResult);

  TestValidator.predicate(
    "empty status parameter should return users",
    allUsersResult.data.length > 0,
  );

  // 6. Test pagination works correctly
  const paginatedResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 2,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginatedResult.data.length <= 2,
  );

  TestValidator.equals(
    "pagination limit should match request",
    paginatedResult.pagination.limit,
    2,
  );

  // 7. Test search functionality with email pattern
  const searchResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        status: "active",
        search: "test",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search with status filter should return valid results",
    searchResult.data.every((user) => user.status === "active"),
  );

  // 8. Test sorting functionality
  const sortedResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        status: "active",
        order_by: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(sortedResult);

  TestValidator.predicate(
    "sorted result should contain users",
    sortedResult.data.length > 0,
  );
}
