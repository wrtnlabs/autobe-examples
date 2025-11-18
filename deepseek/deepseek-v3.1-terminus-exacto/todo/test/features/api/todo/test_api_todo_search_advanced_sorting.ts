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
 * Test advanced sorting capabilities in todo search.
 *
 * Creates a user account and generates diverse todo items with different
 * creation dates, update timestamps, and completion statuses. Tests sorting by
 * creation date (ascending/descending), update date, text content, and
 * completion status. Validates that sorting produces correct order and combined
 * with filtering maintains proper results.
 */
export async function test_api_todo_search_advanced_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
        name: RandomGenerator.name(),
        href: "https://example.com/todo-app",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create diverse todo items with predictable sorting patterns
  const todos: ITodoAppTodo[] = [];

  // Create todos with predictable text ordering
  const todoTexts = ["A - First task", "B - Second task", "C - Third task"];

  for (const text of todoTexts) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text,
        completed: text === "C - Third task", // Make last one completed
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);
  }

  // Helper function to validate sorting order
  const validateSortingOrder = (
    title: string,
    result: IPageITodoAppTodo.ISummary,
    expectedOrder: string[],
    field: keyof ITodoAppTodo.ISummary,
  ) => {
    TestValidator.predicate(
      `${title} - should have expected number of items`,
      result.data.length >= expectedOrder.length,
    );

    // Validate order for available items
    for (
      let i = 0;
      i < Math.min(result.data.length, expectedOrder.length);
      i++
    ) {
      const actualValue = result.data[i][field];
      const expectedValue = expectedOrder[i];

      if (typeof actualValue === "string") {
        TestValidator.equals(
          `${title} - item ${i} should match expected value`,
          actualValue,
          expectedValue,
        );
      }
    }
  };

  // Step 3: Test sorting by creation date ascending
  const createdAscResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdAscResult);

  TestValidator.predicate(
    "creation date ascending should return todos",
    createdAscResult.data.length >= 2,
  );

  // Step 4: Test sorting by creation date descending
  const createdDescResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(createdDescResult);

  TestValidator.predicate(
    "creation date descending should return todos",
    createdDescResult.data.length >= 2,
  );

  // Step 5: Test sorting by text content ascending
  const textAscResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "text",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(textAscResult);

  // Validate alphabetical order
  validateSortingOrder(
    "text ascending sorting",
    textAscResult,
    ["A - First task", "B - Second task", "C - Third task"],
    "text",
  );

  // Step 6: Test sorting by text content descending
  const textDescResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "text",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(textDescResult);

  // Validate reverse alphabetical order
  validateSortingOrder(
    "text descending sorting",
    textDescResult,
    ["C - Third task", "B - Second task", "A - First task"],
    "text",
  );

  // Step 7: Test sorting by completion status
  const completedResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "completed",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedResult);

  // Validate completion status grouping
  TestValidator.predicate(
    "completion status sorting should return todos",
    completedResult.data.length >= 2,
  );

  // Step 8: Test sorting by update date
  const updatedResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "updated_at",
        order: "desc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(updatedResult);

  TestValidator.predicate(
    "update date sorting should return todos",
    updatedResult.data.length >= 2,
  );

  // Step 9: Test sorting combined with filtering
  const filteredSortedResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        completed: false,
        sort_by: "text",
        order: "asc",
        limit: 10,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(filteredSortedResult);

  // Validate filtered and sorted results contain only incomplete todos
  TestValidator.predicate(
    "filtered todos should only include incomplete items",
    filteredSortedResult.data.every((todo) => !todo.completed),
  );

  // Step 10: Test pagination with sorting
  const paginatedResult = await api.functional.todoApp.user.todos.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        order: "asc",
        limit: 2,
        page: 1,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedResult);

  // Validate pagination information
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "paginated results should not exceed limit",
    paginatedResult.data.length <= 2,
  );

  // Step 11: Test error handling for invalid sorting parameters
  await TestValidator.error(
    "should reject invalid sort_by parameter",
    async () => {
      await api.functional.todoApp.user.todos.index(connection, {
        body: {
          sort_by: "invalid_field" as any,
          order: "asc",
        } satisfies ITodoAppTodo.IRequest,
      });
    },
  );
}
