import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_update_title_successfully(
  connection: api.IConnection,
) {
  // Step 1: Register new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const registered: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(registered);
  TestValidator.predicate(
    "user registered successfully",
    registered.id !== null,
  );

  // Step 2: Create initial todo
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const createdTodo: ITodoAppTodo = await api.functional.todoApp.todos.create(
    connection,
    {
      body: {
        title: initialTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "initial title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.predicate(
    "todo is not completed initially",
    !createdTodo.isCompleted,
  );

  const originalCreatedAt = createdTodo.createdAt;
  const originalUpdatedAt = createdTodo.updatedAt;

  // Step 3: Update todo title
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.authenticatedUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Validate update results
  TestValidator.equals("title was updated", updatedTodo.title, newTitle);
  TestValidator.predicate(
    "completion status unchanged",
    updatedTodo.isCompleted === createdTodo.isCompleted,
  );
  TestValidator.equals(
    "creation timestamp unchanged",
    updatedTodo.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "modification timestamp was updated",
    updatedTodo.updatedAt !== originalUpdatedAt,
  );
  TestValidator.equals("todo id remains same", updatedTodo.id, createdTodo.id);
}
