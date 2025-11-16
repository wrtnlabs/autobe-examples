import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test advanced search filtering with date ranges and combined criteria.
 *
 * This test validates the todo search functionality by creating multiple todos
 * with specific due dates and content, then testing various filter combinations
 * including date ranges, text search, and pagination parameters to ensure the
 * search API correctly filters and paginates results according to the specified
 * criteria.
 */
export async function test_api_todo_search_advanced_filtering(
  connection: api.IConnection,
) {
  // Create user account with authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      password_hash: "hashed_password_stub",
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Create todos with different due dates and content
  const todos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const now = new Date();
      const futureDate = new Date(
        now.getTime() + (index + 1) * 24 * 60 * 60 * 1000,
      ); // 1,2,3,4,5 days in future

      const todo = await api.functional.todoApp.user.todos.create(connection, {
        body: {
          title: `Test Todo ${index + 1} ${index % 2 === 0 ? "urgent" : "normal"}`,
          description: `This is todo description ${index + 1}`,
          due_date: futureDate.toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  // Create one todo without due date
  const todoWithoutDueDate = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Todo without due date",
        description: "This todo has no due date set",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithoutDueDate);

  // Test 1: Search with future due date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const tomorrowResults = await api.functional.todoApp.user.search.todos.search(
    connection,
    {
      body: {
        due_after: tomorrow.toISOString(),
        due_before: dayAfterTomorrow.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(tomorrowResults);

  // Verify we get todos with due dates in the specified range
  TestValidator.predicate(
    "should find todos with due dates between tomorrow and day after tomorrow",
    tomorrowResults.data.length > 0,
  );

  // Test 2: Search with text query and date range
  const textWithDateResults =
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        search: "urgent",
        due_after: new Date().toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(textWithDateResults);

  // Verify we get todos containing "urgent" in title with future due dates
  TestValidator.predicate(
    "should find urgent todos with future due dates",
    textWithDateResults.data.length > 0,
  );

  // Test 3: Search with pagination
  const firstPageResults =
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstPageResults);

  TestValidator.equals(
    "first page should have exactly 2 items",
    firstPageResults.data.length,
    2,
  );

  const secondPageResults =
    await api.functional.todoApp.user.search.todos.search(connection, {
      body: {
        page: 2,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(secondPageResults);

  TestValidator.predicate(
    "second page should have items",
    secondPageResults.data.length > 0,
  );

  // Test 4: Search with only text query
  const textResults = await api.functional.todoApp.user.search.todos.search(
    connection,
    {
      body: {
        search: "normal",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(textResults);

  TestValidator.predicate(
    "should find todos with 'normal' in title",
    textResults.data.length > 0,
  );

  // Test 5: Search with past due date (should return empty since all todos are future-dated)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  const pastResults = await api.functional.todoApp.user.search.todos.search(
    connection,
    {
      body: {
        due_before: pastDate.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(pastResults);

  TestValidator.equals(
    "should find no todos with past due dates",
    pastResults.data.length,
    0,
  );
}
