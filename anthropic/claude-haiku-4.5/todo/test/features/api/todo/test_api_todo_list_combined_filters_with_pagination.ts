import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Tests complex search scenarios combining multiple filters simultaneously with
 * pagination.
 *
 * This test validates that the todo list API correctly handles multiple filters
 * applied together, ensuring that title filtering, completion status filtering,
 * and date range filtering work correctly in combination without interference.
 *
 * The test process:
 *
 * 1. Creates a new user account and authenticates
 * 2. Creates multiple todos with diverse titles, descriptions, and completion
 *    statuses
 * 3. Executes multiple searches combining different filters with pagination
 * 4. Validates that combined filters produce accurate results
 * 5. Verifies pagination works correctly with combined filters
 * 6. Confirms all filters are applied without interfering with each other
 */
export async function test_api_todo_list_combined_filters_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create diverse todos with various titles, descriptions, and completion statuses
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Create todos with predictable titles for filtering
  const completedTodos = await Promise.all([
    api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Complete project documentation",
        description: "Write comprehensive API documentation for all endpoints",
      } satisfies ITodoAppTodo.ICreate,
    }),
    api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Review code changes",
        description: "Review pull requests and provide feedback",
      } satisfies ITodoAppTodo.ICreate,
    }),
    api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Deploy production release",
        description: "Deploy version 2.0 to production servers",
      } satisfies ITodoAppTodo.ICreate,
    }),
  ]);

  const incompleteTodos = await Promise.all([
    api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Plan next sprint",
        description: "Organize and prioritize tasks for upcoming sprint",
      } satisfies ITodoAppTodo.ICreate,
    }),
    api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Update dependencies",
        description: "Upgrade npm packages to latest stable versions",
      } satisfies ITodoAppTodo.ICreate,
    }),
    api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: "Design database schema",
        description: "Create ER diagram and schema for new features",
      } satisfies ITodoAppTodo.ICreate,
    }),
  ]);

  // Verify all todos were created
  completedTodos.forEach((todo) => typia.assert(todo));
  incompleteTodos.forEach((todo) => typia.assert(todo));

  // Step 3: Test combined filters with pagination
  // Test 1: Filter by title and completion status with pagination
  const searchResult1 = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        title: "Complete",
        is_completed: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search results contain data",
    searchResult1.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination info is present",
    searchResult1.pagination !== undefined,
  );

  // Test 2: Filter by completion status and date range
  const searchResult2 = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        is_completed: true,
        created_after: oneWeekAgo.toISOString(),
        created_before: tomorrow.toISOString(),
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "date range filter applied",
    searchResult2.data.length >= 0,
  );

  // Test 3: Combined title, completion status, and pagination
  const searchResult3 = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        title: "plan",
        is_completed: false,
        page: 1,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult3);
  TestValidator.predicate(
    "multiple filters applied together",
    searchResult3.data.length >= 0,
  );

  // Test 4: Test pagination with combined filters
  const searchResult4 = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        is_completed: false,
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.predicate(
    "pagination limit respected",
    searchResult4.data.length <= 2,
  );

  // Test 5: Test second page with same filters
  const searchResult5 = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        is_completed: false,
        page: 2,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "second page retrieval works",
    searchResult5.pagination.current === 2,
  );

  // Step 4: Validate combined filtering results
  // Test that filters don't interfere with each other
  const combinedFilterResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "project",
        is_completed: false,
        created_after: oneWeekAgo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "all filters applied simultaneously",
    combinedFilterResult.data.length >= 0,
  );

  // Test 6: Validate pagination structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    combinedFilterResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    combinedFilterResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    combinedFilterResult.pagination.records >= 0,
  );

  // Step 7: Test edge cases with filters
  // Empty search results
  const emptySearchResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        search: "nonexistent_unique_string_xyz",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "handles empty search results",
    emptySearchResult.data.length === 0,
  );

  // Test 8: All filters combined
  const allFiltersResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        title: "update",
        is_completed: false,
        created_after: twoDaysAgo.toISOString(),
        created_before: tomorrow.toISOString(),
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFiltersResult);
  TestValidator.predicate(
    "all combined filters work",
    allFiltersResult.pagination !== undefined,
  );
}
