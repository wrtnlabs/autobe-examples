import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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

export async function test_api_todo_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: "user@test.com",
      password: "User1234!",
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Create incomplete todos
  const incompleteTodo1 = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(incompleteTodo1);
  const incompleteTodo2 = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(incompleteTodo2);
  // 3. Create more incomplete todos (API doesn't support creating completed todos directly)
  const incompleteTodo3 = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(incompleteTodo3);
  const incompleteTodo4 = await api.functional.todoApp.user.todos.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        dueDate: new Date().toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(incompleteTodo4);
  // 4. Test 'all' status filter (default)
  const allTodosResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTodosResponse);
  TestValidator.equals(
    "all filter returns all todos",
    allTodosResponse.data.length,
    4,
  );
  TestValidator.equals(
    "all filter includes incomplete",
    allTodosResponse.data.filter((t) => !t.is_complete).length,
    4,
  );
  // 5. Test 'complete' status filter
  const completeTodosResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "complete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeTodosResponse);
  TestValidator.equals(
    "complete filter returns only complete todos",
    completeTodosResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "complete filter has no complete todos",
    completeTodosResponse.data.every((t) => t.is_complete),
  );
  // 6. Test 'incomplete' status filter
  const incompleteTodosResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: "incomplete",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteTodosResponse);
  TestValidator.equals(
    "incomplete filter returns only incomplete todos",
    incompleteTodosResponse.data.length,
    4,
  );
  TestValidator.predicate(
    "all incomplete todos marked incomplete",
    incompleteTodosResponse.data.every((t) => !t.is_complete),
  );
  // 7. Test null status filter (same as 'all')
  const nullStatusResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        status: null,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(nullStatusResponse);
  TestValidator.equals(
    "null status filter behaves like 'all'",
    nullStatusResponse.data.length,
    allTodosResponse.data.length,
  );
  // 8. Test default status filter (undefined)
  const undefinedStatusResponse = await api.functional.todoApp.user.todos.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(undefinedStatusResponse);
  TestValidator.equals(
    "undefined status filter behaves like 'all'",
    undefinedStatusResponse.data.length,
    allTodosResponse.data.length,
  );
  // 9. Verify no cross-user data leakage with new user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234!",
    } satisfies ITodoAppUser.IJoin,
  });
  const adminTodosResponse = await api.functional.todoApp.user.todos.index(
    adminConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(adminTodosResponse);
  TestValidator.equals(
    "admin cannot see user's todos",
    adminTodosResponse.data.length,
    0,
  );
}
