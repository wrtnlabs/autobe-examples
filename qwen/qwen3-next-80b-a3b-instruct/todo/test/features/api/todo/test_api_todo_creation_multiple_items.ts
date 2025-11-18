import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_creation_multiple_items(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to establish session
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ITodoListUser.ICreate;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCredentials,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create multiple todo items consecutively
  const todoItemsCount = 5;
  const createdTodos: ITodoListTodo[] = [];

  for (let i = 0; i < todoItemsCount; i++) {
    const todoData = RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }) satisfies ITodoListTodo.ICreate;

    const createdTodo: ITodoListTodo =
      await api.functional.todoList.user.todoItems.create(connection, {
        body: todoData,
      });
    typia.assert(createdTodo);
    createdTodos.push(createdTodo);
  }

  // Step 3: Validate that each todo item has unique UUID
  const todoIds = createdTodos.map((todo) => todo.id);
  const uniqueTodoIds = [...new Set(todoIds)];
  TestValidator.equals(
    "all created todos have unique UUIDs",
    todoIds.length,
    uniqueTodoIds.length,
  );

  // Step 4: Verify all todos are associated with the authenticated user
  createdTodos.forEach((todo) => {
    TestValidator.equals(
      "todo owner ID matches authenticated user ID",
      todo.todo_list_users_id.id,
      authenticatedUser.id,
    );
  });
}
