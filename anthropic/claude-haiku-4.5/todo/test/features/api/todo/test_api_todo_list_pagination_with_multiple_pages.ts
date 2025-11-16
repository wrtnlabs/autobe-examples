import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_list_pagination_with_multiple_pages(
  connection: api.IConnection,
) {
  // Step 1: Create user account and authenticate
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todos to exceed single page limit
  const todoCount = 35; // Create 35 todos to test multiple pages with limit of 10
  const createdTodos: ITodoAppTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
      connection,
      {
        body: {
          title: `Todo Item ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
  }

  TestValidator.equals(
    "created todos count matches expected",
    createdTodos.length,
    todoCount,
  );

  // Step 3: Retrieve first page with limit of 10
  const page1: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page1);

  TestValidator.equals("first page current is 1", page1.pagination.current, 1);
  TestValidator.equals("first page limit is 10", page1.pagination.limit, 10);
  TestValidator.equals("first page data length is 10", page1.data.length, 10);
  TestValidator.equals(
    "first page total records is 35",
    page1.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "first page total pages is 4",
    page1.pagination.pages,
    4,
  );

  // Step 4: Retrieve second page
  const page2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page2);

  TestValidator.equals("second page current is 2", page2.pagination.current, 2);
  TestValidator.equals("second page limit is 10", page2.pagination.limit, 10);
  TestValidator.equals("second page data length is 10", page2.data.length, 10);
  TestValidator.equals(
    "second page total records is 35",
    page2.pagination.records,
    todoCount,
  );
  TestValidator.equals(
    "second page total pages is 4",
    page2.pagination.pages,
    4,
  );

  // Verify page 2 data is different from page 1
  TestValidator.notEquals(
    "page 2 first item differs from page 1 first item",
    page2.data[0].id,
    page1.data[0].id,
  );

  // Step 5: Retrieve third page
  const page3: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 3,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page3);

  TestValidator.equals("third page current is 3", page3.pagination.current, 3);
  TestValidator.equals("third page limit is 10", page3.pagination.limit, 10);
  TestValidator.equals("third page data length is 10", page3.data.length, 10);

  // Step 6: Retrieve fourth page (partial page with 5 items)
  const page4: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 4,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page4);

  TestValidator.equals("fourth page current is 4", page4.pagination.current, 4);
  TestValidator.equals("fourth page limit is 10", page4.pagination.limit, 10);
  TestValidator.equals("fourth page data length is 5", page4.data.length, 5);
  TestValidator.equals(
    "fourth page total records is 35",
    page4.pagination.records,
    todoCount,
  );

  // Step 7: Verify no duplicate items across pages
  const allPageItems = [
    ...page1.data,
    ...page2.data,
    ...page3.data,
    ...page4.data,
  ];
  const uniqueIds = new Set(allPageItems.map((t) => t.id));
  TestValidator.equals(
    "all items across pages are unique",
    uniqueIds.size,
    allPageItems.length,
  );

  // Step 8: Test pagination with different limit
  const pageWithLimit20: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pageWithLimit20);

  TestValidator.equals(
    "page 1 with limit 20 has 20 items",
    pageWithLimit20.data.length,
    20,
  );
  TestValidator.equals(
    "limit 20 total pages is 2",
    pageWithLimit20.pagination.pages,
    2,
  );

  // Step 9: Test second page with limit 20
  const page2Limit20: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page2Limit20);

  TestValidator.equals(
    "page 2 with limit 20 has 15 items",
    page2Limit20.data.length,
    15,
  );

  // Step 10: Verify pagination consistency
  TestValidator.equals(
    "all pages have same total records",
    page1.pagination.records,
    page2Limit20.pagination.records,
  );
}
