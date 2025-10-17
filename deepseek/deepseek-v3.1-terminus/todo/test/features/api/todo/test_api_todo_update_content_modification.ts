import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test updating the content of an existing todo item.
 *
 * This scenario validates that the text content of a todo can be modified while
 * preserving other properties like completion status. The test creates a todo
 * item with initial content, then updates it with new content to ensure the
 * content modification functionality works correctly and that the updated
 * content is properly saved and retrieved.
 */
export async function test_api_todo_update_content_modification(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a user for todo operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123" satisfies string;

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Create an initial todo item with original content
  const initialContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todo = await api.functional.minimalTodo.todos.create(connection, {
    body: {
      content: initialContent,
    } satisfies IMinimalTodoTodo.ICreate,
  });
  typia.assert(todo);

  // Verify initial todo properties
  TestValidator.equals(
    "todo should have initial content",
    todo.content,
    initialContent,
  );
  TestValidator.predicate(
    "todo should be incomplete initially",
    todo.completed === false,
  );

  // 3. Update the todo content with new text
  const updatedContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedTodo = await api.functional.minimalTodo.todos.update(
    connection,
    {
      todoId: todo.id,
      body: {
        content: updatedContent,
      } satisfies IMinimalTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // 4. Validate that content was updated correctly
  TestValidator.equals(
    "todo content should be updated",
    updatedTodo.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "content should change from original",
    updatedTodo.content,
    initialContent,
  );

  // 5. Verify other properties remain unchanged
  TestValidator.equals(
    "todo ID should remain the same",
    updatedTodo.id,
    todo.id,
  );
  TestValidator.predicate(
    "completion status should remain false",
    updatedTodo.completed === false,
  );
  TestValidator.equals(
    "creation timestamp should not change",
    updatedTodo.created_at,
    todo.created_at,
  );
  TestValidator.predicate(
    "updated timestamp should reflect change",
    updatedTodo.updated_at !== todo.updated_at,
  );

  // 6. Additional validation: Ensure the update persists by content comparison
  TestValidator.predicate(
    "updated content should be different from original",
    updatedContent !== initialContent && updatedTodo.content === updatedContent,
  );
}
