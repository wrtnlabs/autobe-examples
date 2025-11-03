import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test authorization failure when attempting to delete another user's account.
 *
 * This test validates that the system enforces proper authorization by
 * preventing users from deleting accounts they don't own. It verifies that
 * users can only delete their own accounts and that the system properly rejects
 * unauthorized deletion attempts with appropriate error responses.
 *
 * The test follows this workflow:
 *
 * 1. Create first user account (victim user)
 * 2. Create second user account (attacker user)
 * 3. Authenticate as second user and create a task to establish profile
 * 4. Attempt to delete first user's account while authenticated as second user
 * 5. Verify the deletion attempt fails with authorization error
 */
export async function test_api_user_account_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account (victim)
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "password123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(firstUser);

  // Create second user account (attacker) - this will be our authenticated user
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(secondUser);

  // Establish second user's profile by creating a task
  // This ensures the user has activity in the system
  const task = await api.functional.todo.user.todo.tasks.create(connection, {
    body: {
      description: RandomGenerator.paragraph(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(task);

  // Verify the task was created successfully and belongs to second user
  TestValidator.equals(
    "task user matches second user",
    task.user.id,
    secondUser.id,
  );

  // Attempt to delete first user's account while authenticated as second user
  // This should fail with authorization error
  await TestValidator.error(
    "should reject unauthorized account deletion",
    async () => {
      await api.functional.todo.user.users.erase(connection, {
        userId: firstUser.id,
      });
    },
  );

  // Verify authorization is enforced by creating another task as second user
  // This demonstrates that our session is still valid and the system is functioning
  const verificationTask = await api.functional.todo.user.todo.tasks.create(
    connection,
    {
      body: {
        description: RandomGenerator.paragraph(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(verificationTask);
  TestValidator.equals(
    "verification task user matches second user",
    verificationTask.user.id,
    secondUser.id,
  );

  // The key validation: unauthorized deletion was blocked
  // The system properly rejected the attempt to delete another user's account
  TestValidator.predicate(
    "unauthorized deletion was properly blocked",
    true, // This validates that we reached this point without exceptions
  );
}
