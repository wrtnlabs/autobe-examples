import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user self-service account update functionality.
 *
 * Validates that authenticated users can successfully update their own account
 * information including email and password. This test ensures the complete
 * self-service profile management workflow functions correctly.
 *
 * Test flow:
 *
 * 1. Create new user account and obtain authentication tokens
 * 2. Update user's email and password using authenticated session
 * 3. Verify response contains updated user information
 * 4. Validate password is not exposed in response
 * 5. Confirm updated_at timestamp is modified
 * 6. Test partial updates (email only, password only)
 */
export async function test_api_user_profile_update_own_account(
  connection: api.IConnection,
) {
  // Step 1: Create user account and authenticate
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: initialEmail,
      password: initialPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Verify initial registration succeeded
  TestValidator.equals(
    "initial email matches",
    registeredUser.email,
    initialEmail,
  );
  TestValidator.predicate(
    "user ID is valid UUID",
    typia.is<string & tags.Format<"uuid">>(registeredUser.id),
  );
  TestValidator.predicate(
    "email not verified initially",
    registeredUser.email_verified === false,
  );

  // Step 2: Update user profile with new email and password
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPassword = RandomGenerator.alphaNumeric(12);

  const updatedUser = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        email: updatedEmail,
        password: updatedPassword,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 3: Verify response contains updated information
  TestValidator.equals("user ID unchanged", updatedUser.id, registeredUser.id);
  TestValidator.equals(
    "email updated successfully",
    updatedUser.email,
    updatedEmail,
  );

  // Step 4: Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedUser.created_at,
    registeredUser.created_at,
  );
  TestValidator.predicate(
    "updated_at modified",
    new Date(updatedUser.updated_at).getTime() >=
      new Date(registeredUser.updated_at).getTime(),
  );

  // Step 5: Test partial update - email only
  const newEmail = typia.random<string & tags.Format<"email">>();
  const emailOnlyUpdate = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        email: newEmail,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(emailOnlyUpdate);
  TestValidator.equals(
    "email only update successful",
    emailOnlyUpdate.email,
    newEmail,
  );

  // Step 6: Test partial update - password only
  const newPassword = RandomGenerator.alphaNumeric(12);
  const passwordOnlyUpdate = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: registeredUser.id,
      body: {
        password: newPassword,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(passwordOnlyUpdate);
  TestValidator.equals(
    "email unchanged after password update",
    passwordOnlyUpdate.email,
    newEmail,
  );
  TestValidator.predicate(
    "updated_at changed after password update",
    new Date(passwordOnlyUpdate.updated_at).getTime() >
      new Date(emailOnlyUpdate.updated_at).getTime(),
  );
}
