import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todo search results are properly scoped to the authenticated user
 * and that users cannot access other users' todos through any query
 * parameters.
 *
 * This critical security scenario validates data ownership and privacy controls
 * by creating multiple user accounts, each with their own set of todos, and
 * verifying that User A querying their todo list never receives User B's todos
 * regardless of filter parameters, search terms, pagination settings, or
 * sorting options.
 *
 * The test validates that:
 *
 * 1. Each user can only see their own todos
 * 2. Search results are scoped to the authenticated user
 * 3. Filter parameters don't bypass user isolation
 * 4. Pagination metadata reflects only the user's own data
 * 5. JWT token-based user_id scoping cannot be bypassed
 */
export async function test_api_todo_data_isolation_between_users(
  connection: api.IConnection,
) {
  // Create User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: "password123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  // Create todos for User A with specific characteristics
  const userATodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: `UserA Todo ${index + 1}`,
          description: `Description for User A's todo number ${index + 1}`,
          status: RandomGenerator.pick([
            "pending",
            "in_progress",
            "completed",
          ] as const),
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          completed: index % 2 === 0,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Create User B with a separate connection
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: "password456",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // Create todos for User B with overlapping characteristics
  const userBTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: `UserB Todo ${index + 1}`,
          description: `Description for User B's todo number ${index + 1}`,
          status: RandomGenerator.pick([
            "pending",
            "in_progress",
            "completed",
          ] as const),
          priority: RandomGenerator.pick(["low", "medium", "high"] as const),
          completed: index % 2 === 1,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Switch back to User A by updating connection headers
  const userAConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: userA.token.access,
    },
  };

  // Test 1: Get all todos for User A - should only see User A's todos
  const userAAllTodos: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userAConnection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userAAllTodos);

  TestValidator.equals(
    "User A should see exactly 5 todos",
    userAAllTodos.pagination.records,
    5,
  );

  // Verify all returned todos belong to User A
  TestValidator.predicate(
    "All todos should belong to User A",
    userAAllTodos.data.every((todo) =>
      userATodos.some((userATodo) => userATodo.id === todo.id),
    ),
  );

  // Test 2: Search with specific terms that might match User B's todos
  const searchResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userAConnection, {
      body: {
        search: "UserB",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.equals(
    "Search for 'UserB' should return 0 results for User A",
    searchResults.pagination.records,
    0,
  );

  // Test 3: Filter by status - verify only User A's todos are returned
  const statusFilter: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userAConnection, {
      body: {
        status: "pending",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(statusFilter);

  TestValidator.predicate(
    "Status filter should only return User A's todos",
    statusFilter.data.every((todo) =>
      userATodos.some((userATodo) => userATodo.id === todo.id),
    ),
  );

  // Test 4: Filter by completion status
  const completedFilter: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userAConnection, {
      body: {
        completed: true,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completedFilter);

  TestValidator.predicate(
    "Completed filter should only return User A's completed todos",
    completedFilter.data.every((todo) =>
      userATodos.some(
        (userATodo) => userATodo.id === todo.id && userATodo.completed,
      ),
    ),
  );

  // Test 5: Switch to User B and verify their isolation
  const userBConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: userB.token.access,
    },
  };

  const userBAllTodos: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userBConnection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBAllTodos);

  TestValidator.equals(
    "User B should see exactly 5 todos",
    userBAllTodos.pagination.records,
    5,
  );

  TestValidator.predicate(
    "All todos should belong to User B",
    userBAllTodos.data.every((todo) =>
      userBTodos.some((userBTodo) => userBTodo.id === todo.id),
    ),
  );

  // Test 6: User B searches for User A's content - should get no results
  const userBSearchUserA: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userBConnection, {
      body: {
        search: "UserA",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBSearchUserA);

  TestValidator.equals(
    "User B search for 'UserA' should return 0 results",
    userBSearchUserA.pagination.records,
    0,
  );

  // Test 7: Verify pagination metadata integrity for User B
  const userBPaginated: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userBConnection, {
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBPaginated);

  TestValidator.equals(
    "Pagination should show User B's total count",
    userBPaginated.pagination.records,
    5,
  );

  TestValidator.predicate(
    "Page size should be limited to 3",
    userBPaginated.data.length <= 3,
  );

  TestValidator.predicate(
    "Paginated results should only contain User B's todos",
    userBPaginated.data.every((todo) =>
      userBTodos.some((userBTodo) => userBTodo.id === todo.id),
    ),
  );
}
