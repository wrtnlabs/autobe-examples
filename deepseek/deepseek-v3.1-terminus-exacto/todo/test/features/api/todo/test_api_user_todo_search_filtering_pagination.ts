import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Comprehensive todo search functionality test with filtering, pagination, and
 * sorting.
 *
 * This test validates the complete todo search workflow including:
 *
 * - User authentication and todo creation
 * - Status-based filtering (active vs completed)
 * - Text search functionality in todo titles
 * - Pagination with different page sizes
 * - Sorting by various fields
 * - Pagination metadata validation
 * - User isolation (ensuring only authenticated user's todos are accessible)
 */
export async function test_api_user_todo_search_filtering_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple todo items with different statuses and titles
  const todoTitles = [
    "Buy groceries for the week",
    "Complete project documentation",
    "Call client about meeting schedule",
    "Review code changes",
    "Prepare presentation slides",
    "Schedule team building activity",
    "Update project timeline",
    "Research new technologies",
    "Write unit tests",
    "Deploy application to production",
  ] as const;

  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < todoTitles.length; i++) {
    const todo = await api.functional.todoApp.user.users.todos.create(
      connection,
      {
        userId: user.id,
        body: {
          title: todoTitles[i],
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Step 3: Test status filtering - all todos should be active by default
  const activeTodosResponse =
    await api.functional.todoApp.user.users.todos.index(connection, {
      userId: user.id,
      body: {
        status: "active",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(activeTodosResponse);

  TestValidator.equals(
    "active todos should include all created todos",
    activeTodosResponse.data.length,
    createdTodos.length,
  );

  // Test that completed status returns empty (since no todos are completed)
  const completedTodosResponse =
    await api.functional.todoApp.user.users.todos.index(connection, {
      userId: user.id,
      body: {
        status: "completed",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completedTodosResponse);

  TestValidator.equals(
    "completed todos should be empty since none are marked completed",
    completedTodosResponse.data.length,
    0,
  );

  // Step 4: Test text search functionality
  const searchResponse = await api.functional.todoApp.user.users.todos.index(
    connection,
    {
      userId: user.id,
      body: {
        search: "project",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResponse);

  TestValidator.predicate(
    "search should return todos containing 'project' in title",
    searchResponse.data.length > 0 &&
      searchResponse.data.every((todo) =>
        todo.title.toLowerCase().includes("project"),
      ),
  );

  // Test search with non-matching term
  const emptySearchResponse =
    await api.functional.todoApp.user.users.todos.index(connection, {
      userId: user.id,
      body: {
        search: "nonexistentterm",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(emptySearchResponse);

  TestValidator.equals(
    "search with non-matching term should return empty results",
    emptySearchResponse.data.length,
    0,
  );

  // Step 5: Test pagination with different page sizes
  const pageSize = 3;
  const paginatedResponse = await api.functional.todoApp.user.users.todos.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: pageSize,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "pagination should return correct number of items per page",
    paginatedResponse.data.length,
    Math.min(pageSize, createdTodos.length),
  );

  TestValidator.equals(
    "pagination metadata should show correct total records",
    paginatedResponse.pagination.records,
    createdTodos.length,
  );

  TestValidator.equals(
    "pagination metadata should show correct current page",
    paginatedResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination metadata should show correct limit",
    paginatedResponse.pagination.limit,
    pageSize,
  );

  // Step 6: Test sorting options
  const sortedByCreatedAt = await api.functional.todoApp.user.users.todos.index(
    connection,
    {
      userId: user.id,
      body: {
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);

  TestValidator.predicate(
    "sorted response should contain todos",
    sortedByCreatedAt.data.length > 0,
  );

  // Step 7: Test combination of filters
  const combinedFilterResponse =
    await api.functional.todoApp.user.users.todos.index(connection, {
      userId: user.id,
      body: {
        search: "project",
        status: "active",
        order_by: "title",
        order_direction: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(combinedFilterResponse);

  // Step 8: Validate that only authenticated user's todos are accessible
  // Create a second user with a fresh connection to avoid authentication conflicts
  const secondUserConnection: api.IConnection = { ...connection, headers: {} };
  const secondUserEmail = typia.random<string & tags.Format<"email">>();

  const secondUser = await api.functional.auth.user.join(secondUserConnection, {
    body: {
      email: secondUserEmail,
      password: "anotherPassword123",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUser);

  // Verify second user has no todos initially
  const secondUserTodos = await api.functional.todoApp.user.users.todos.index(
    secondUserConnection,
    {
      userId: secondUser.id,
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(secondUserTodos);

  TestValidator.equals(
    "second user should have no todos initially",
    secondUserTodos.data.length,
    0,
  );

  // Verify first user still has all their todos (using original connection)
  const firstUserTodosAfterSwitch =
    await api.functional.todoApp.user.users.todos.index(connection, {
      userId: user.id,
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserTodosAfterSwitch);

  TestValidator.equals(
    "first user should still have all their todos",
    firstUserTodosAfterSwitch.data.length,
    createdTodos.length,
  );
}
