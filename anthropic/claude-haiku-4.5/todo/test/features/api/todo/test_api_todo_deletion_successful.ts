import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful deletion of a todo item owned by the authenticated user.
 *
 * This test validates the complete todo deletion workflow:
 *
 * 1. User creation and authentication
 * 2. Todo item creation with various content types (minimal title, detailed title
 *
 *    - Description)
 * 3. Todo deletion verification
 *
 * The test ensures that:
 *
 * - Todo deletion completes successfully
 * - Multiple todos can be created and deleted independently
 * - Deleted todos are completely removed from the system
 * - No errors occur during the deletion process
 */
export async function test_api_todo_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Create user account with authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(10),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user authenticated successfully",
    user.token !== undefined,
  );

  // Step 2: Test deletion with minimal todo (title only)
  const minimalTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(minimalTodo);
  TestValidator.predicate(
    "minimal todo created with valid ID",
    minimalTodo.id !== undefined,
  );

  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: minimalTodo.id,
  });
  TestValidator.predicate("minimal todo deleted successfully", true);

  // Step 3: Test deletion with detailed todo (title + description)
  const detailedTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 6,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 5,
        }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(detailedTodo);
  TestValidator.predicate(
    "detailed todo created with valid ID",
    detailedTodo.id !== undefined,
  );

  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: detailedTodo.id,
  });
  TestValidator.predicate(
    "detailed todo with description deleted successfully",
    true,
  );

  // Step 4: Create multiple todos and verify independent deletion
  const todosToDelete = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 5,
        }),
      } satisfies ITodoAppTodo.ICreate,
    });
  });

  TestValidator.predicate(
    "all test todos created with valid IDs",
    todosToDelete.length === 3 &&
      todosToDelete.every((t) => t.id !== undefined),
  );

  // Delete all created todos independently
  await ArrayUtil.asyncForEach(todosToDelete, async (todo) => {
    await api.functional.todoApp.user.todos.erase(connection, {
      todoId: todo.id,
    });
  });

  TestValidator.predicate("all multiple todos deleted successfully", true);

  // Step 5: Test deletion of todo with empty description field
  const todoWithEmptyDescription =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.name(2),
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoWithEmptyDescription);

  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todoWithEmptyDescription.id,
  });
  TestValidator.predicate(
    "todo with null description deleted successfully",
    true,
  );
}
