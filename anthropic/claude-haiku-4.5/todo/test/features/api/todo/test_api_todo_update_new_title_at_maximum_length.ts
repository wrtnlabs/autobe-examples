import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_update_new_title_at_maximum_length(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account for testing todo operations
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create an initial todo item with a standard title
  const initialTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(initialTodo);

  // Step 3: Create a 255-character title (maximum allowed length)
  // Generate exactly 255 random alphabetic characters
  const maxLengthTitle = ArrayUtil.repeat(255, () =>
    RandomGenerator.alphabets(1),
  ).join("");

  // Step 4: Update the todo with the maximum length title
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        title: maxLengthTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 5: Validate that the title was updated to the maximum length without truncation
  TestValidator.equals(
    "updated todo title matches maximum length input",
    updatedTodo.title,
    maxLengthTitle,
  );

  // Step 6: Verify title length is exactly 255 characters
  TestValidator.predicate(
    "title length equals maximum allowed 255 characters",
    updatedTodo.title.length === 255,
  );

  // Step 7: Verify other todo properties remain unchanged
  TestValidator.equals(
    "todo ID remains the same after update",
    updatedTodo.id,
    initialTodo.id,
  );

  TestValidator.predicate(
    "todo owner matches authenticated user",
    updatedTodo.todo_app_user_id === user.id,
  );
}
