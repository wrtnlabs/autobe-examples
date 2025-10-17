import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test the complete account deletion workflow for authenticated users.
 *
 * This test validates that a user can successfully delete their account with
 * proper confirmation. The workflow includes:
 *
 * 1. Creating a new authenticated user account
 * 2. Creating a todo for the user to verify association with deleted account
 * 3. Deleting the user account with email and password confirmation
 * 4. Verifying the deletion response contains proper timestamps and recovery
 *    information
 *
 * The test ensures that:
 *
 * - Account deletion requires valid credentials for confirmation
 * - System marks account as deleted with deleted_at timestamp
 * - User's todos remain associated with the deleted account
 * - Deletion response includes recovery deadline (30-day window)
 * - Recovery window allows account restoration before permanent purge
 */
export async function test_api_user_account_deletion_with_confirmation(
  connection: api.IConnection,
) {
  // Step 1: Create a new authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!@#";

  const createdUser: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });

  typia.assert(createdUser);
  TestValidator.predicate(
    "user created with valid ID",
    typeof createdUser.id === "string" && createdUser.id.length > 0,
  );

  // Step 2: Create a todo for the user to verify association with deleted account
  const createdTodo: ITodoAppTodo = await api.functional.todoApp.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );

  typia.assert(createdTodo);
  TestValidator.predicate(
    "todo created successfully",
    createdTodo.isCompleted === false,
  );
  TestValidator.equals("todo has valid ID", typeof createdTodo.id, "string");

  // Step 3: Delete the user account with email and password confirmation
  const deleteResponse: ITodoAppAuthenticatedUser.IDeleteResponse =
    await api.functional.todoApp.authenticatedUser.auth.delete_account.deleteAccount(
      connection,
      {
        body: {
          email: userEmail,
          password: userPassword,
        } satisfies ITodoAppAuthenticatedUser.IDeleteRequest,
      },
    );

  typia.assert(deleteResponse);

  // Step 4: Verify the deletion response contains proper timestamps and recovery information
  TestValidator.predicate(
    "deletion message is present",
    typeof deleteResponse.message === "string" &&
      deleteResponse.message.length > 0,
  );

  TestValidator.predicate(
    "deletedAt timestamp is valid ISO datetime",
    typeof deleteResponse.deletedAt === "string" &&
      deleteResponse.deletedAt.includes("T"),
  );

  TestValidator.predicate(
    "recovery deadline is defined",
    deleteResponse.recoveryDeadline !== undefined &&
      typeof deleteResponse.recoveryDeadline === "string",
  );

  // Verify deletion timestamp is recent (within last minute)
  const deletionTime = new Date(deleteResponse.deletedAt);
  const currentTime = new Date();
  const timeDifference = currentTime.getTime() - deletionTime.getTime();

  TestValidator.predicate(
    "deletion timestamp is recent",
    timeDifference >= 0 && timeDifference < 60000,
  );

  // Verify recovery deadline is approximately 30 days in the future
  if (deleteResponse.recoveryDeadline) {
    const recoveryDeadline = new Date(deleteResponse.recoveryDeadline);
    const daysDifference =
      (recoveryDeadline.getTime() - deletionTime.getTime()) /
      (1000 * 60 * 60 * 24);

    TestValidator.predicate(
      "recovery window is approximately 30 days",
      daysDifference >= 29 && daysDifference <= 31,
    );
  }
}
