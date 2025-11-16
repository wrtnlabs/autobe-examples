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
 * Tests user's ability to retrieve their todo list with pagination support.
 *
 * This test validates the core todo listing functionality where users browse
 * their tasks with proper pagination controls. It verifies that users can
 * retrieve paginated todo lists with configurable page sizes (1-100), navigate
 * through multiple pages, and receive accurate pagination metadata.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a test user
 * 2. Create multiple test todos (25 items) to enable pagination testing
 * 3. Test default pagination behavior
 * 4. Test various page sizes and page numbers
 * 5. Verify pagination metadata accuracy (current, limit, records, pages)
 * 6. Test edge cases (minimum and maximum limits)
 * 7. Validate data scoping to authenticated user
 */
export async function test_api_todo_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a test user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create 25 test todos to enable meaningful pagination testing
  const todoCount = 25;
  const createdTodos = await ArrayUtil.asyncRepeat(todoCount, async (index) => {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `Test Todo ${index + 1} - ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: RandomGenerator.pick([
          "pending",
          "in_progress",
          "completed",
          "cancelled",
        ] as const),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);
    return todo;
  });

  TestValidator.equals("created todos count", createdTodos.length, todoCount);

  // Step 3: Test default pagination (should use default limit)
  const defaultPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {} satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default pagination returns data",
    defaultPage.data.length > 0,
  );
  TestValidator.equals(
    "total records match created todos",
    defaultPage.pagination.records,
    todoCount,
  );

  // Step 4: Test with limit=10 and navigate through pages
  const limit10Page1 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(limit10Page1);
  TestValidator.equals(
    "page 1 with limit 10 current page",
    limit10Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 10 limit",
    limit10Page1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 with limit 10 total records",
    limit10Page1.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "page 1 with limit 10 total pages",
    limit10Page1.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1 with limit 10 data count",
    limit10Page1.data.length,
    10,
  );

  const limit10Page2 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(limit10Page2);
  TestValidator.equals(
    "page 2 with limit 10 current page",
    limit10Page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 with limit 10 data count",
    limit10Page2.data.length,
    10,
  );

  const limit10Page3 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 3,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(limit10Page3);
  TestValidator.equals(
    "page 3 with limit 10 current page",
    limit10Page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 with limit 10 data count",
    limit10Page3.data.length,
    5,
  );

  // Step 5: Test with limit=5 for different page size
  const limit5Page1 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(limit5Page1);
  TestValidator.equals(
    "page 1 with limit 5 current page",
    limit5Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 5 limit",
    limit5Page1.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 with limit 5 total pages",
    limit5Page1.pagination.pages,
    5,
  );
  TestValidator.equals(
    "page 1 with limit 5 data count",
    limit5Page1.data.length,
    5,
  );

  // Step 6: Test edge case - minimum limit (1)
  const limit1Page1 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(limit1Page1);
  TestValidator.equals(
    "page 1 with limit 1 data count",
    limit1Page1.data.length,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 1 total pages",
    limit1Page1.pagination.pages,
    todoCount,
  );

  // Step 7: Test edge case - maximum limit (100)
  const limit100Page1 = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(limit100Page1);
  TestValidator.equals(
    "page 1 with limit 100 data count",
    limit100Page1.data.length,
    todoCount,
  );
  TestValidator.equals(
    "page 1 with limit 100 total pages",
    limit100Page1.pagination.pages,
    1,
  );
}
