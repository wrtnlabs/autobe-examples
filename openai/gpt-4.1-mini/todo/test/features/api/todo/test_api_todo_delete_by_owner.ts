import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreateBody = {
    email: `user${Date.now()}@example.com`,
    password: "password123",
    name: "Test User",
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new todo item
  const todoCreateBody = {
    title: "Test Todo Item",
    description: null,
    status: "pending",
    due_date: null,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 3. Delete the created todo item by its owner
  await api.functional.todoList.user.todoListTodos.erase(connection, {
    id: createdTodo.id,
  });
}
