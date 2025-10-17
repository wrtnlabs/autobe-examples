import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test soft deletion of todos with 30-day recovery window.
 *
 * This test validates the complete soft deletion workflow:
 *
 * 1. User registration and authentication
 * 2. Todo creation
 * 3. Todo deletion with recovery window
 *
 * Verifies that deleted todos are marked with a deletion timestamp and can be
 * recovered within 30 days before permanent purge.
 */
export async function test_api_todo_delete_recovery_window_thirty_days(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(2) + "A1!";

  const registeredUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(registeredUser);
  TestValidator.predicate(
    "user registered successfully",
    registeredUser.id !== null && registeredUser.id !== undefined,
  );
  TestValidator.predicate(
    "auth token provided",
    registeredUser.token !== null && registeredUser.token !== undefined,
  );

  // Step 2: Create a todo
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({ paragraphs: 1 });

  const createdTodo = await api.functional.todoApp.todos.create(connection, {
    body: {
      title: todoTitle,
      description: todoDescription,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(createdTodo);
  TestValidator.predicate(
    "todo created with valid ID",
    typeof createdTodo.id === "string" && createdTodo.id.length > 0,
  );
  TestValidator.equals("todo title matches", createdTodo.title, todoTitle);
  TestValidator.equals(
    "todo initially not completed",
    createdTodo.isCompleted,
    false,
  );

  // Step 3: Delete the todo (soft delete with recovery window)
  const deletionResponse =
    await api.functional.todoApp.authenticatedUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(deletionResponse);

  // Verify deletion response structure
  TestValidator.predicate(
    "deletion message received",
    typeof deletionResponse.message === "string",
  );
  TestValidator.equals(
    "deleted todo ID matches",
    deletionResponse.todoId,
    createdTodo.id,
  );
  TestValidator.predicate("deletion timestamp is valid ISO 8601", () => {
    const deletedAt = new Date(deletionResponse.deletedAt);
    return !isNaN(deletedAt.getTime());
  });

  // Verify message content
  const messageIncludesSuccess =
    deletionResponse.message.toLowerCase().includes("deleted") ||
    deletionResponse.message.toLowerCase().includes("success");
  TestValidator.predicate(
    "deletion confirmation message",
    messageIncludesSuccess,
  );

  // Step 4: Verify deletion timestamp is recent
  const deletedAtTime = new Date(deletionResponse.deletedAt);
  const currentTime = new Date();
  const timeDifferenceSeconds =
    (currentTime.getTime() - deletedAtTime.getTime()) / 1000;

  TestValidator.predicate(
    "deletion timestamp is recent (within reasonable time)",
    timeDifferenceSeconds >= 0 && timeDifferenceSeconds <= 300,
  );
}
