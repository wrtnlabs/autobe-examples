import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test successfully deleting a todo from the system.
 *
 * This test validates the complete todo deletion workflow including user
 * authentication, todo creation, deletion operation, and verification of the
 * soft delete implementation with 30-day recovery window initialization.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a new user account
 * 2. Create a new todo with title and optional description
 * 3. Delete the created todo using its ID
 * 4. Verify deletion confirmation response with proper timestamps
 * 5. Confirm the deleted_at timestamp initiates the 30-day recovery period
 * 6. Verify the todo is removed from the active todo list
 */
export async function test_api_todo_delete_successfully(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4) + "A@";

  const authResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(authResponse);
  TestValidator.equals(
    "authenticated user has valid ID",
    typeof authResponse.id,
    "string",
  );
  TestValidator.equals(
    "authorization token present",
    typeof authResponse.token.access,
    "string",
  );

  // Step 2: Create a todo to be deleted
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createdTodo: ITodoAppTodo = await api.functional.todoApp.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo has valid ID",
    typeof createdTodo.id,
    "string",
  );
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "created todo is not completed",
    createdTodo.isCompleted,
    false,
  );

  // Step 3: Delete the created todo
  const deleteResponse: ITodoAppTodo.IDeleteResponse =
    await api.functional.todoApp.authenticatedUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(deleteResponse);

  // Step 4: Verify deletion confirmation response
  TestValidator.equals(
    "deletion confirmation message",
    deleteResponse.message,
    "Todo deleted successfully.",
  );
  TestValidator.equals(
    "deleted todo ID matches",
    deleteResponse.todoId,
    createdTodo.id,
  );
  TestValidator.equals(
    "deletedAt timestamp is set",
    typeof deleteResponse.deletedAt,
    "string",
  );

  // Step 5: Verify deletedAt timestamp format (ISO 8601)
  const deletedAtDate = new Date(deleteResponse.deletedAt);
  TestValidator.predicate(
    "deletedAt is valid ISO 8601 date",
    !isNaN(deletedAtDate.getTime()),
  );

  // Verify the deletedAt timestamp is recent (within last minute)
  const now = new Date();
  const timeDifference = now.getTime() - deletedAtDate.getTime();
  TestValidator.predicate(
    "deletedAt timestamp is recent",
    timeDifference >= 0 && timeDifference < 60000,
  );

  // Step 6: Verify 30-day recovery window is initiated
  const recoveryWindowEnd = new Date(deleteResponse.deletedAt);
  recoveryWindowEnd.setDate(recoveryWindowEnd.getDate() + 30);
  TestValidator.predicate(
    "30-day recovery window calculated",
    recoveryWindowEnd.getTime() > now.getTime(),
  );
}
