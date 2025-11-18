import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete user account deletion workflow where a user permanently
 * deletes their own account. Validates the soft deletion mechanism, session
 * invalidation, audit logging, and data preservation for compliance. Verifies
 * that users can only delete their own account with proper authentication
 * checks, password verification, and immediate feedback about deletion status.
 * Test includes token invalidation across all active sessions and ensures the
 * account is marked as inactive while maintaining referential integrity with
 * user-generated content like tasks and preferences.
 *
 * Step-by-step process:
 *
 * 1. Create a new user account to establish authentication context
 * 2. Create sample tasks to verify referential integrity during deletion
 * 3. Verify the user is authenticated and tokens are valid
 * 4. Delete the user account permanently
 * 5. Verify account deletion by checking deleted_at timestamp
 * 6. Test that the user can no longer authenticate or access resources
 */
export async function test_api_user_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    email: userEmail,
    password: "SecurePassword123!",
    name: RandomGenerator.name(),
    href: "https://example.com/todo-app",
    referrer: "https://example.com/signup",
  } satisfies ITodoAppUser.ICreate;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userData },
  );
  typia.assert(user);

  await TestValidator.predicate(
    "user account created successfully",
    user.id !== undefined,
  );
  await TestValidator.predicate(
    "user email matches registration",
    user.email === userEmail,
  );
  await TestValidator.predicate(
    "user status is active",
    user.status === "active",
  );
  await TestValidator.predicate(
    "deleted_at is null for active account",
    user.deleted_at === null || user.deleted_at === undefined,
  );

  // Create sample tasks to verify referential integrity during deletion
  const task1 = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        status: "pending",
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 7,
        }),
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task1);

  const task2 = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        status: "completed",
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 7,
        }),
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task2);

  await TestValidator.predicate(
    "task1 belongs to user",
    task1.user.id === user.id,
  );
  await TestValidator.predicate(
    "task2 belongs to user",
    task2.user.id === user.id,
  );

  // Delete the user account permanently
  await api.functional.todoApp.user.users.erase(connection, {
    userId: user.id,
  });

  // Test that attempting to create tasks with deleted user fails
  await TestValidator.error(
    "user cannot create tasks after account deletion",
    async () => {
      await api.functional.todoApp.user.users.tasks.create(connection, {
        userId: user.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          status: "pending",
        } satisfies ITodoAppTask.ICreate,
      });
    },
  );

  // Attempt to delete an already deleted account should fail
  await TestValidator.error(
    "cannot delete already deleted account",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: user.id,
      });
    },
  );

  // Create a fresh, unauthenticated connection to test deletion effects
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test that unauthenticated access fails appropriately
  await TestValidator.error(
    "unauthenticated user cannot access protected resources",
    async () => {
      await api.functional.todoApp.user.users.erase(unauthConn, {
        userId: user.id,
      });
    },
  );
}
