import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test that deleting a todo returns proper confirmation response.
 *
 * User creates account, logs in, creates a todo, and initiates deletion. Verify
 * the deletion completes successfully and returns a proper confirmation
 * response containing the deleted todo ID and deletion timestamp.
 *
 * This test validates the complete deletion workflow:
 *
 * 1. Register and authenticate a new user
 * 2. Create a todo item for deletion testing
 * 3. Delete the todo and verify confirmation response is received
 * 4. Validate the deletion response contains required fields (message, todoId,
 *    deletedAt)
 * 5. Confirm deletion response data matches the deleted todo
 */
export async function test_api_todo_delete_verification_required(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TempPassword123!";

  const authenticatedUser: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(authenticatedUser);
  TestValidator.predicate(
    "authenticated user has valid ID",
    authenticatedUser.id.length > 0,
  );

  // Step 2: Create a todo for deletion testing
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 3 });

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
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "new todo is incomplete",
    createdTodo.isCompleted,
    false,
  );

  // Step 3: Delete the todo and verify confirmation response
  const deleteResponse: ITodoAppTodo.IDeleteResponse =
    await api.functional.todoApp.authenticatedUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(deleteResponse);

  // Step 4: Validate deletion response contains required fields and proper types
  TestValidator.predicate(
    "deletion response includes success message",
    deleteResponse.message === "Todo deleted successfully.",
  );
  TestValidator.equals(
    "deletion response contains correct todo ID",
    deleteResponse.todoId,
    createdTodo.id,
  );
  TestValidator.predicate(
    "deletion response contains valid deleted timestamp in ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(deleteResponse.deletedAt),
  );
  TestValidator.predicate(
    "deleted timestamp is valid date",
    !isNaN(new Date(deleteResponse.deletedAt).getTime()),
  );

  // Step 5: Verify deletion response contains all required data
  TestValidator.predicate(
    "deletion workflow completed successfully with proper confirmation",
    deleteResponse.message.length > 0 &&
      deleteResponse.todoId === createdTodo.id &&
      deleteResponse.deletedAt.length > 0,
  );
}
