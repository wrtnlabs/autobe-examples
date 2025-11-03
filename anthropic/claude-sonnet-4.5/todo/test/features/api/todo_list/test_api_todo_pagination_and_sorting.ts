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
 * Test pagination and sorting capabilities of the todo list search operation.
 *
 * This test validates that users can efficiently browse through large todo
 * collections using configurable page sizes and multiple sorting options. The
 * scenario creates a user account, generates multiple todo items with varying
 * properties, then retrieves todos using different pagination parameters and
 * sorting options.
 *
 * The test validates:
 *
 * 1. Page size limits are respected
 * 2. Correct number of items are returned per page
 * 3. Sorting order is correct (by creation date newest/oldest, by update date)
 * 4. Pagination metadata (total count, current page, total pages) is accurate
 * 5. Navigation between pages works correctly
 */
export async function test_api_todo_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Create a test user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        ip: "127.0.0.1",
        href: "https://test.example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(user);

  // Create multiple todo items to test pagination (at least 25 items for meaningful pagination)
  const todoCount = 25;
  const createdTodos: ITodoListTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: `Todo ${i + 1} - ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph(),
          status: i % 3 === 0 ? "complete" : "incomplete",
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Test 1: Default pagination (page 1, default limit)
  const defaultPage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default pagination returns data",
    defaultPage.data.length > 0,
  );

  TestValidator.equals(
    "total records matches created todos",
    defaultPage.pagination.records,
    todoCount,
  );

  // Test 2: Pagination with specific page size (limit 10)
  const limitedPage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(limitedPage);

  TestValidator.equals(
    "page size limit is respected",
    limitedPage.data.length,
    10,
  );

  TestValidator.equals("current page is 1", limitedPage.pagination.current, 1);

  TestValidator.equals("limit is set to 10", limitedPage.pagination.limit, 10);

  // Test 3: Navigate to page 2
  const secondPage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current number is 2",
    secondPage.pagination.current,
    2,
  );

  TestValidator.predicate("second page has data", secondPage.data.length > 0);

  // Test 4: Sort by creation date (newest first)
  const newestFirst: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort: "created_newest",
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(newestFirst);

  // Verify sorting order - newest should come first
  if (newestFirst.data.length >= 2) {
    const firstCreated = new Date(newestFirst.data[0].created_at);
    const secondCreated = new Date(newestFirst.data[1].created_at);

    TestValidator.predicate(
      "newest first sorting is correct",
      firstCreated >= secondCreated,
    );
  }

  // Test 5: Sort by creation date (oldest first)
  const oldestFirst: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort: "created_oldest",
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(oldestFirst);

  // Verify sorting order - oldest should come first
  if (oldestFirst.data.length >= 2) {
    const firstCreated = new Date(oldestFirst.data[0].created_at);
    const secondCreated = new Date(oldestFirst.data[1].created_at);

    TestValidator.predicate(
      "oldest first sorting is correct",
      firstCreated <= secondCreated,
    );
  }

  // Test 6: Sort by update date (most recent first)
  const recentlyUpdated: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        sort: "updated_recent",
        limit: 20,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(recentlyUpdated);

  // Verify sorting order - most recently updated first
  if (recentlyUpdated.data.length >= 2) {
    const firstUpdated = new Date(recentlyUpdated.data[0].updated_at);
    const secondUpdated = new Date(recentlyUpdated.data[1].updated_at);

    TestValidator.predicate(
      "updated recent sorting is correct",
      firstUpdated >= secondUpdated,
    );
  }

  // Test 7: Filter by status and paginate
  const completeOnly: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(completeOnly);

  // Verify all returned items are complete
  TestValidator.predicate(
    "status filter returns only complete todos",
    completeOnly.data.every((todo) => todo.status === "complete"),
  );

  // Test 8: Calculate total pages correctly
  const smallPageSize: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(smallPageSize);

  const expectedPages = Math.ceil(todoCount / 5);
  TestValidator.equals(
    "total pages calculated correctly",
    smallPageSize.pagination.pages,
    expectedPages,
  );

  // Test 9: Large page size
  const largePage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(largePage);

  TestValidator.equals(
    "large page size returns all available todos",
    largePage.data.length,
    todoCount,
  );

  // Test 10: Search with pagination
  const searchWithPage: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "Todo",
        page: 1,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchWithPage);

  TestValidator.predicate(
    "search with pagination returns results",
    searchWithPage.data.length > 0,
  );
}
