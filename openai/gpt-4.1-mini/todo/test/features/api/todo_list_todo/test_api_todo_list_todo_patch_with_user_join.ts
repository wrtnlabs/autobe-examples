import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_todo_patch_with_user_join(
  connection: api.IConnection,
) {
  // 1. User joins and authenticates, receiving an authorized user response
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // 2. Query the todo list todos endpoint with no filters, page 1, limit 10
  const todoRequest1 = {
    page: 1,
    limit: 10,
  } satisfies ITodoListTodo.IRequest;

  const todoResponse1: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todoListTodos.index(connection, {
      body: todoRequest1,
    });
  typia.assert(todoResponse1);

  TestValidator.equals(
    "page current matches request",
    todoResponse1.pagination.current,
    todoRequest1.page,
  );
  TestValidator.equals(
    "page limit matches request",
    todoResponse1.pagination.limit,
    todoRequest1.limit,
  );

  // Validate todos list summary properties
  for (const todo of todoResponse1.data) {
    typia.assert(todo);
    TestValidator.predicate(
      `todo item has valid id: ${todo.id}`,
      typeof todo.id === "string" && todo.id.length > 0,
    );
    TestValidator.predicate(
      `todo item has title: ${todo.title}`,
      todo.title.length > 0,
    );
    TestValidator.predicate(
      `todo item is_complete is boolean: ${todo.is_complete}`,
      typeof todo.is_complete === "boolean",
    );
  }

  // 3. Query todo list with is_complete filter true
  const todoRequest2 = {
    page: 1,
    limit: 5,
    is_complete: true,
  } satisfies ITodoListTodo.IRequest;

  const todoResponse2: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todoListTodos.index(connection, {
      body: todoRequest2,
    });
  typia.assert(todoResponse2);

  TestValidator.equals(
    "page current matches request (filter is_complete)",
    todoResponse2.pagination.current,
    todoRequest2.page,
  );
  TestValidator.equals(
    "page limit matches request (filter is_complete)",
    todoResponse2.pagination.limit,
    todoRequest2.limit,
  );

  for (const todo of todoResponse2.data) {
    typia.assert(todo);
    TestValidator.predicate(
      `filtered todo is complete: ${todo.id}`,
      todo.is_complete === true,
    );
  }

  // 4. Query todo list with keyword search
  const keywordSample = RandomGenerator.substring("urgent important pending");
  const todoRequest3 = {
    page: 2,
    limit: 7,
    search: keywordSample,
  } satisfies ITodoListTodo.IRequest;

  const todoResponse3: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todoListTodos.index(connection, {
      body: todoRequest3,
    });
  typia.assert(todoResponse3);

  TestValidator.equals(
    "page current matches request (search filter)",
    todoResponse3.pagination.current,
    todoRequest3.page,
  );
  TestValidator.equals(
    "page limit matches request (search filter)",
    todoResponse3.pagination.limit,
    todoRequest3.limit,
  );

  for (const todo of todoResponse3.data) {
    typia.assert(todo);
    TestValidator.predicate(
      `todo title or id contains search keyword: ${todo.id}`,
      todo.title.includes(keywordSample) || todo.id.includes(keywordSample),
    );
  }
}
