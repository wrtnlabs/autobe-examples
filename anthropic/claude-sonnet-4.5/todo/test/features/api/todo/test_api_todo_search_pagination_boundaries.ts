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
 * Test pagination boundary conditions and edge cases for todo list search.
 *
 * This test validates comprehensive pagination scenarios including first page,
 * last page, out-of-range pages, minimum/maximum limits, empty results, and
 * filtered pagination to ensure the todo search API handles all boundary
 * conditions correctly with accurate metadata.
 *
 * Test flow:
 *
 * 1. Authenticate test user
 * 2. Create exactly 25 test todos with sequential patterns
 * 3. Test first page (page=1, limit=10)
 * 4. Test middle page (page=2, limit=10)
 * 5. Test last page with fewer items (page=3, limit=10)
 * 6. Test out-of-range page (page=10)
 * 7. Test minimum limit boundary (limit=1)
 * 8. Test maximum limit boundary (limit=100)
 * 9. Validate pagination metadata accuracy across all scenarios
 */
export async function test_api_todo_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as test user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<16>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create exactly 25 test todos for controlled pagination testing
  const todoCount = 25;
  const createdTodos: ITodoListTodo[] = await ArrayUtil.asyncRepeat(
    todoCount,
    async (index) => {
      const todo = await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: `Test Todo ${index + 1}`,
          description: `Pagination test todo number ${index + 1}`,
          status: "pending",
          priority: "medium",
          completed: false,
        } satisfies ITodoListTodo.ICreate,
      });
      typia.assert(todo);
      return todo;
    },
  );

  TestValidator.equals("created todos count", createdTodos.length, todoCount);

  // Step 3: Test first page (page=1, limit=10)
  const firstPage = await api.functional.todoList.user.todos.index(connection, {
    body: {
      page: 1,
      limit: 10,
      order_by: "created_at",
      order_direction: "asc",
    } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(firstPage);

  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page records", firstPage.pagination.records, 25);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 3);
  TestValidator.equals("first page data length", firstPage.data.length, 10);

  // Step 4: Test middle page (page=2, limit=10)
  const secondPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(secondPage);

  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 3);
  TestValidator.equals("second page data length", secondPage.data.length, 10);

  // Step 5: Test last page with fewer items (page=3, limit=10)
  const lastPage = await api.functional.todoList.user.todos.index(connection, {
    body: {
      page: 3,
      limit: 10,
      order_by: "created_at",
      order_direction: "asc",
    } satisfies ITodoListTodo.IRequest,
  });
  typia.assert(lastPage);

  TestValidator.equals("last page current", lastPage.pagination.current, 3);
  TestValidator.equals("last page limit", lastPage.pagination.limit, 10);
  TestValidator.equals("last page records", lastPage.pagination.records, 25);
  TestValidator.equals("last page pages", lastPage.pagination.pages, 3);
  TestValidator.equals("last page data length", lastPage.data.length, 5);

  // Step 6: Test out-of-range page (page=10, beyond total pages)
  const outOfRangePage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 10,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(outOfRangePage);

  TestValidator.equals(
    "out-of-range page current",
    outOfRangePage.pagination.current,
    10,
  );
  TestValidator.equals(
    "out-of-range page records",
    outOfRangePage.pagination.records,
    25,
  );
  TestValidator.equals(
    "out-of-range page pages",
    outOfRangePage.pagination.pages,
    3,
  );
  TestValidator.equals(
    "out-of-range page data length",
    outOfRangePage.data.length,
    0,
  );

  // Step 7: Test minimum limit boundary (limit=1)
  const minLimitPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(minLimitPage);

  TestValidator.equals("min limit current", minLimitPage.pagination.current, 1);
  TestValidator.equals("min limit value", minLimitPage.pagination.limit, 1);
  TestValidator.equals(
    "min limit records",
    minLimitPage.pagination.records,
    25,
  );
  TestValidator.equals("min limit pages", minLimitPage.pagination.pages, 25);
  TestValidator.equals("min limit data length", minLimitPage.data.length, 1);

  // Step 8: Test maximum limit boundary (limit=100)
  const maxLimitPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.equals("max limit current", maxLimitPage.pagination.current, 1);
  TestValidator.equals("max limit value", maxLimitPage.pagination.limit, 100);
  TestValidator.equals(
    "max limit records",
    maxLimitPage.pagination.records,
    25,
  );
  TestValidator.equals("max limit pages", maxLimitPage.pagination.pages, 1);
  TestValidator.equals("max limit data length", maxLimitPage.data.length, 25);

  // Step 9: Test pagination with filtered results (using status filter)
  const filteredPage = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered results pagination is valid",
    filteredPage.pagination.records <= 25 &&
      filteredPage.data.length <= filteredPage.pagination.limit,
  );

  // Step 10: Verify consistency - total records across different page requests
  TestValidator.equals(
    "pagination records consistency",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "pagination total pages consistency",
    firstPage.pagination.pages,
    3,
  );
}
