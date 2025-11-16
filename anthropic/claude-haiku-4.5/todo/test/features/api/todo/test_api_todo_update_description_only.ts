import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_update_description_only(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a todo with initial title and description
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: initialTitle,
        description: initialDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Verify initial state
  TestValidator.equals(
    "initial title matches",
    createdTodo.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial description matches",
    createdTodo.description,
    initialDescription,
  );
  TestValidator.equals(
    "todo is initially not completed",
    createdTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at is null initially",
    createdTodo.completed_at,
    null,
  );

  // 3. Update only the description
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: createdTodo.id,
      body: {
        description: newDescription,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // 4. Validate that description was updated
  TestValidator.equals(
    "description was updated",
    updatedTodo.description,
    newDescription,
  );

  // 5. Validate that title remained unchanged
  TestValidator.equals(
    "title remained unchanged",
    updatedTodo.title,
    initialTitle,
  );

  // 6. Validate that is_completed status remained unchanged
  TestValidator.equals(
    "is_completed status unchanged",
    updatedTodo.is_completed,
    false,
  );

  // 7. Validate that completed_at remained null
  TestValidator.equals(
    "completed_at remained null",
    updatedTodo.completed_at,
    null,
  );

  // 8. Validate that created_at remained the same
  TestValidator.equals(
    "created_at remained immutable",
    updatedTodo.created_at,
    createdTodo.created_at,
  );

  // 9. Validate that updated_at was changed
  TestValidator.notEquals(
    "updated_at was modified",
    updatedTodo.updated_at,
    createdTodo.updated_at,
  );

  // 10. Validate that user ownership is preserved
  TestValidator.equals(
    "user ownership preserved",
    updatedTodo.todo_app_user_id,
    user.id,
  );
}
