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
 * Test pagination behavior with edge cases and boundary conditions.
 *
 * This test validates the todo list pagination API across various edge cases
 * including:
 *
 * - Requesting pages beyond available data
 * - Boundary limit values (1 and 100)
 * - Sequential page navigation
 * - Data integrity (no duplicates or omissions)
 * - Pagination metadata accuracy
 *
 * Workflow:
 *
 * 1. Create user account and authenticate
 * 2. Populate with specific number of todos (25 items)
 * 3. Test pagination with limit=1 (minimum boundary)
 * 4. Test pagination with limit=100 (maximum boundary)
 * 5. Request page beyond available data
 * 6. Navigate through all pages sequentially
 * 7. Verify complete data retrieval without duplicates
 * 8. Validate pagination metadata accuracy
 */
export async function test_api_todo_list_pagination_edge_cases(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create exactly 25 todos for pagination testing
  const TODO_COUNT = 25;
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    TODO_COUNT,
    async () => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  TestValidator.equals(
    "created todos count matches expected",
    createdTodos.length,
    TODO_COUNT,
  );

  // Step 3: Test minimum boundary - limit=1 (single item per page)
  const singleItemPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(singleItemPage);

  TestValidator.equals(
    "single item page should contain exactly 1 item",
    singleItemPage.data.length,
    1,
  );
  TestValidator.equals(
    "pagination metadata - total records",
    singleItemPage.pagination.records,
    TODO_COUNT,
  );
  TestValidator.equals(
    "pagination metadata - total pages with limit 1",
    singleItemPage.pagination.pages,
    TODO_COUNT,
  );
  TestValidator.equals(
    "pagination metadata - current page",
    singleItemPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination metadata - limit",
    singleItemPage.pagination.limit,
    1,
  );

  // Step 4: Test maximum boundary - limit=100 (maximum allowed page size)
  const maxItemsPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(maxItemsPage);

  TestValidator.equals(
    "max items page should contain all todos",
    maxItemsPage.data.length,
    TODO_COUNT,
  );
  TestValidator.equals(
    "pagination metadata - total pages with limit 100",
    maxItemsPage.pagination.pages,
    1,
  );

  // Step 5: Test requesting page beyond available data
  const beyondPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 100,
        limit: 10,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(beyondPage);

  TestValidator.equals(
    "beyond available pages should return empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page should still have correct total records",
    beyondPage.pagination.records,
    TODO_COUNT,
  );

  // Step 6: Sequential page navigation with limit=10
  const LIMIT_PER_PAGE = 10;
  const expectedPages = Math.ceil(TODO_COUNT / LIMIT_PER_PAGE);
  const allCollectedTodos: ITodoListTodo.ISummary[] = [];

  for (let pageNum = 1; pageNum <= expectedPages; pageNum++) {
    const pageResult = await api.functional.todoList.user.todos.index(
      connection,
      {
        body: {
          page: pageNum,
          limit: LIMIT_PER_PAGE,
        } satisfies ITodoListTodo.IRequest,
      },
    );
    typia.assert(pageResult);

    TestValidator.equals(
      `page ${pageNum} - current page metadata`,
      pageResult.pagination.current,
      pageNum,
    );
    TestValidator.equals(
      `page ${pageNum} - total pages metadata`,
      pageResult.pagination.pages,
      expectedPages,
    );
    TestValidator.equals(
      `page ${pageNum} - total records metadata`,
      pageResult.pagination.records,
      TODO_COUNT,
    );

    // Collect todos from this page
    allCollectedTodos.push(...pageResult.data);

    // Verify page size (last page may have fewer items)
    if (pageNum < expectedPages) {
      TestValidator.equals(
        `page ${pageNum} should have full page size`,
        pageResult.data.length,
        LIMIT_PER_PAGE,
      );
    } else {
      const expectedLastPageSize =
        TODO_COUNT % LIMIT_PER_PAGE || LIMIT_PER_PAGE;
      TestValidator.equals(
        `last page should have remaining items`,
        pageResult.data.length,
        expectedLastPageSize,
      );
    }
  }

  // Step 7: Verify no duplicates across all pages
  const collectedIds = allCollectedTodos.map((todo) => todo.id);
  const uniqueIds = new Set(collectedIds);

  TestValidator.equals(
    "no duplicate todos across pages",
    uniqueIds.size,
    collectedIds.length,
  );

  // Step 8: Verify no omissions - all created todos should be retrieved
  TestValidator.equals(
    "all todos retrieved through pagination",
    allCollectedTodos.length,
    TODO_COUNT,
  );

  // Verify each created todo exists in collected results
  for (const createdTodo of createdTodos) {
    const found = allCollectedTodos.find((t) => t.id === createdTodo.id);
    TestValidator.predicate(
      `created todo ${createdTodo.id} should exist in paginated results`,
      found !== undefined,
    );
  }
}
