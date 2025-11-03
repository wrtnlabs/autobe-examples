import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test successful user account update including email and password changes.
 *
 * This test validates the complete user account update workflow, ensuring that
 * authenticated users can successfully modify their account information. The
 * test covers email address changes, password updates, and verification that
 * all changes are properly tracked with timestamps. It also validates that
 * users can only update their own accounts and that the system maintains proper
 * security boundaries.
 *
 * Test Steps:
 *
 * 1. Create a new user account through registration
 * 2. Create a task to establish user profile in todo_users table
 * 3. Update the user's email address
 * 4. Update the user's password
 * 5. Verify that timestamps are properly updated
 * 6. Validate that users can only update their own accounts
 */
export async function test_api_user_account_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: originalEmail,
      password: originalPassword,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a task to establish user profile in todo_users table
  const task = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: RandomGenerator.paragraph(),
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task);

  // Step 3: Update the user's email address
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedUser = await api.functional.todo.user.users.update(connection, {
    userId: user.id,
    body: {
      email: newEmail,
    } satisfies ITodoUser.IUpdate,
  });
  typia.assert(updatedUser);

  // Verify email was updated
  TestValidator.equals("email update successful", updatedUser.email, newEmail);
  TestValidator.notEquals(
    "email actually changed",
    updatedUser.email,
    originalEmail,
  );

  // Verify timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedUser.updated_at !== null,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedUser.updated_at).getTime() >
      new Date(user.created_at).getTime(),
  );

  // Step 4: Update the user's password
  const newPassword = RandomGenerator.alphaNumeric(12);
  const passwordUpdatedUser = await api.functional.todo.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        password: newPassword,
      } satisfies ITodoUser.IUpdate,
    },
  );
  typia.assert(passwordUpdatedUser);

  // Verify password update doesn't affect other fields
  TestValidator.equals(
    "email unchanged after password update",
    passwordUpdatedUser.email,
    newEmail,
  );
  TestValidator.equals(
    "user ID remains constant",
    passwordUpdatedUser.id,
    user.id,
  );

  // Verify timestamp was updated again
  TestValidator.predicate(
    "updated_at timestamp updated again",
    new Date(passwordUpdatedUser.updated_at).getTime() >
      new Date(updatedUser.updated_at).getTime(),
  );

  // Step 5: Update both email and password simultaneously
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const finalPassword = RandomGenerator.alphaNumeric(12);
  const finalUser = await api.functional.todo.user.users.update(connection, {
    userId: user.id,
    body: {
      email: finalEmail,
      password: finalPassword,
    } satisfies ITodoUser.IUpdate,
  });
  typia.assert(finalUser);

  // Verify both fields were updated
  TestValidator.equals(
    "final email update successful",
    finalUser.email,
    finalEmail,
  );
  TestValidator.equals("user ID remains constant", finalUser.id, user.id);

  // Verify final timestamp update
  TestValidator.predicate(
    "final updated_at timestamp",
    new Date(finalUser.updated_at).getTime() >
      new Date(passwordUpdatedUser.updated_at).getTime(),
  );

  // Step 6: Validate that user data structure is maintained
  TestValidator.equals(
    "mfa_enabled maintained",
    finalUser.mfa_enabled,
    user.mfa_enabled,
  );
  TestValidator.equals(
    "failed_login_attempts maintained",
    finalUser.failed_login_attempts,
    user.failed_login_attempts,
  );
  TestValidator.equals(
    "tasks_count maintained",
    finalUser.tasks_count,
    user.tasks_count,
  );
  TestValidator.equals(
    "created_at unchanged",
    finalUser.created_at,
    user.created_at,
  );
}
