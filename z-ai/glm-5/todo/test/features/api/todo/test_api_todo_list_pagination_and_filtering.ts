import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Create 15 todos for testing
  const createdTodos = await ArrayUtil.asyncRepeat(15, async () => {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {},
    );
    return todo;
  });
  typia.assert(createdTodos);
  // 3. Test default list (no filter, page 1, default limit 20)
  const defaultList = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(defaultList);
  TestValidator.equals("default page is 1", defaultList.pagination.current, 1);
  TestValidator.equals("default limit is 20", defaultList.pagination.limit, 20);
  TestValidator.equals(
    "total records match created todos",
    defaultList.pagination.records,
    15,
  );
  TestValidator.predicate("has data", defaultList.data.length > 0);
  // 4. Test filter by 'all'
  const allTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { filter: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodos);
  TestValidator.equals(
    "all filter returns all todos",
    allTodos.pagination.records,
    15,
  );
  TestValidator.predicate("all todos are present", allTodos.data.length === 15);
  // 5. Test filter by 'incomplete' (all created todos are incomplete by default)
  const incompleteTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { filter: "incomplete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteTodos);
  TestValidator.equals(
    "incomplete filter returns all todos",
    incompleteTodos.pagination.records,
    15,
  );
  TestValidator.predicate(
    "all todos are incomplete",
    incompleteTodos.data.every((todo) => todo.is_completed === false),
  );
  // 6. Test filter by 'complete' (should return empty)
  const completeTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { filter: "complete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeTodos);
  TestValidator.equals(
    "complete filter returns empty",
    completeTodos.pagination.records,
    0,
  );
  TestValidator.equals(
    "complete filter has no data",
    completeTodos.data.length,
    0,
  );
  // 7. Test pagination with custom limit
  const paginatedList = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { page: 1, limit: 10 } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedList);
  TestValidator.equals(
    "page 1 with limit 10",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginatedList.pagination.limit, 10);
  TestValidator.equals(
    "total records still 15",
    paginatedList.pagination.records,
    15,
  );
  TestValidator.equals("total pages is 2", paginatedList.pagination.pages, 2);
  TestValidator.equals("data length is 10", paginatedList.data.length, 10);
  // 8. Test page 2
  const page2List = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: { page: 2, limit: 10 } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2List);
  TestValidator.equals("page 2", page2List.pagination.current, 2);
  TestValidator.equals("page 2 data length is 5", page2List.data.length, 5);
  // 9. Verify todo summary structure (description NOT included)
  const firstTodo = allTodos.data[0];
  TestValidator.predicate("has id", typeof firstTodo.id === "string");
  TestValidator.predicate("has title", typeof firstTodo.title === "string");
  TestValidator.predicate(
    "has is_completed",
    typeof firstTodo.is_completed === "boolean",
  );
  TestValidator.predicate(
    "has created_at",
    typeof firstTodo.created_at === "string",
  );
  TestValidator.predicate(
    "start_date can be null or string",
    firstTodo.start_date === null || typeof firstTodo.start_date === "string",
  );
  TestValidator.predicate(
    "due_date can be null or string",
    firstTodo.due_date === null || typeof firstTodo.due_date === "string",
  );
  // 10. Verify default sorting (created_at descending)
  const sortedTodos = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(sortedTodos);
  TestValidator.predicate(
    "sorted by created_at descending",
    sortedTodos.data.every((todo, index) => {
      if (index === 0) return true;
      return (
        new Date(sortedTodos.data[index - 1].created_at) >=
        new Date(todo.created_at)
      );
    }),
  );
}
