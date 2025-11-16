import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a new todo item
  const todoText: string = RandomGenerator.paragraph({ sentences: 4 });
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: todoText,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Update the todo item's text content
  const updatedText: string = RandomGenerator.paragraph({ sentences: 5 });
  const updatedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        text: updatedText,
      } satisfies ITodoListTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "todo text was updated correctly",
    updatedTodo.text,
    updatedText,
  );
  TestValidator.equals(
    "todo ID remained unchanged",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.predicate(
    "todo completion status unchanged",
    () => updatedTodo.completed === createdTodo.completed,
  );
  TestValidator.predicate(
    "updated_at timestamp was refreshed",
    () => new Date(updatedTodo.updated_at) > new Date(createdTodo.created_at),
  );
}
