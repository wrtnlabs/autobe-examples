import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that an authenticated user can successfully update their own account
 * information.
 *
 * User registers a new account, then updates their email address to a new valid
 * email. Validates that the email is updated correctly, the updated_at
 * timestamp is refreshed, and the account remains in active status. Verifies
 * data isolation by ensuring the user can only modify their own account and
 * receives appropriate authorization errors if attempting to modify other
 * users' accounts.
 *
 * Process:
 *
 * 1. Register first user account with initial email
 * 2. Store the original account information and timestamps
 * 3. Update first user's email to a new valid email address
 * 4. Verify the email was updated correctly
 * 5. Verify updated_at timestamp is newer than created_at
 * 6. Verify account status remains active
 * 7. Register second user account
 * 8. Attempt to update first user's account from second user's session
 * 9. Verify authorization error is returned
 */
export async function test_api_user_account_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register first user account
  const firstUserEmail: string = typia.random<string & tags.Format<"email">>();
  const firstUserPassword: string = RandomGenerator.alphabets(10);
  const firstUserRegistered: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUserRegistered);

  // 2. Store original information
  const originalEmail: string = firstUserRegistered.email;
  const originalCreatedAt: string = firstUserRegistered.created_at;
  const originalUpdatedAt: string = firstUserRegistered.updated_at;
  const userId: string = firstUserRegistered.id;

  TestValidator.equals(
    "user email matches registration input",
    firstUserRegistered.email,
    firstUserEmail,
  );
  TestValidator.equals(
    "user status is active",
    firstUserRegistered.status,
    "active",
  );

  // 3. Update first user's email
  const newEmail: string = typia.random<string & tags.Format<"email">>();
  const updateResponse: ITodoAppUser =
    await api.functional.todoApp.user.users.update(connection, {
      userId: userId,
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updateResponse);

  // 4. Verify email was updated
  TestValidator.equals(
    "email was updated successfully",
    updateResponse.email,
    newEmail,
  );
  TestValidator.notEquals(
    "email changed from original",
    updateResponse.email,
    originalEmail,
  );

  // 5. Verify updated_at timestamp is newer
  const updatedAtTime: number = new Date(updateResponse.updated_at).getTime();
  const originalUpdatedAtTime: number = new Date(originalUpdatedAt).getTime();
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    updatedAtTime > originalUpdatedAtTime,
  );

  // 6. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updateResponse.created_at,
    originalCreatedAt,
  );

  // 7. Verify status remains active
  TestValidator.equals(
    "status remains active after update",
    updateResponse.status,
    "active",
  );

  // 8. Register second user
  const secondUserEmail: string = typia.random<string & tags.Format<"email">>();
  const secondUserPassword: string = RandomGenerator.alphabets(10);
  const secondUserRegistered: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: secondUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUserRegistered);

  // 9. Attempt to update first user from second user's session (authorization should fail)
  await TestValidator.error(
    "second user cannot modify first user account",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: userId,
        body: {
          email: "unauthorized@example.com",
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
