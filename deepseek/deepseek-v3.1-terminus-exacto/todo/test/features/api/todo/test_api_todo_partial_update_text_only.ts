import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test partial update focusing only on text modification while leaving
 * completion status unchanged. Validates that the update operation supports
 * selective field modification without requiring complete object replacement.
 */
export async function test_api_todo_partial_update_text_only(
  connection: api.IConnection,
) {
  // Step 1: User authentication - essential prerequisite
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        name: RandomGenerator.name(),
        href: "https://example.com/todo-app",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial todo item with specific completion status
  const initialText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const initialCompletionStatus = false; // Start with incomplete todo

  const initialTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        text: initialText,
        completed: initialCompletionStatus,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(initialTodo);

  // Validate initial todo creation
  await TestValidator.equals(
    "initial todo text matches input",
    initialTodo.text,
    initialText,
  );
  await TestValidator.equals(
    "initial todo completed status matches input",
    initialTodo.completed,
    initialCompletionStatus,
  );

  // Step 3: Perform partial update - modify only text field
  const updatedText = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 10,
  });

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: initialTodo.id,
      body: {
        text: updatedText,
        // Intentionally omit 'completed' field to test partial update
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Validate partial update results
  await TestValidator.equals(
    "updated todo text matches new value",
    updatedTodo.text,
    updatedText,
  );
  await TestValidator.equals(
    "completion status remains unchanged after text-only update",
    updatedTodo.completed,
    initialCompletionStatus,
  );
  await TestValidator.notEquals(
    "todo text has changed from original",
    updatedTodo.text,
    initialText,
  );
  await TestValidator.equals(
    "todo ID remains consistent after update",
    updatedTodo.id,
    initialTodo.id,
  );

  // Additional validation: Ensure timestamps are updated appropriately
  await TestValidator.predicate(
    "updated_at timestamp should be newer than created_at after modification",
    new Date(updatedTodo.updated_at) > new Date(initialTodo.created_at),
  );
}
