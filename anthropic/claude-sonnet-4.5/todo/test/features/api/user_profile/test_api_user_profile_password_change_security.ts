import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password change functionality and security measures.
 *
 * This test validates secure password handling throughout the user profile
 * update workflow. It ensures that passwords are properly validated, securely
 * stored, and never exposed in API responses.
 *
 * Test workflow:
 *
 * 1. Create a new user account with initial password
 * 2. Update the user's password to a new valid password
 * 3. Verify the response does not expose the password or password hash
 * 4. Confirm updated_at timestamp reflects the password change
 * 5. Test password minimum length requirements (8 characters)
 * 6. Validate that weak passwords are rejected
 */
export async function test_api_user_profile_password_change_security(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with initial password
  const initialPassword = "initialPass123";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: initialPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Verify initial user creation
  TestValidator.predicate(
    "user should be created with valid ID",
    createdUser.id !== null && createdUser.id !== undefined,
  );
  TestValidator.equals("user email should match", createdUser.email, userEmail);
  TestValidator.predicate(
    "initial updated_at should be valid",
    createdUser.updated_at !== null && createdUser.updated_at !== undefined,
  );

  const initialUpdatedAt = createdUser.updated_at;

  // Step 2: Update the user's password to a new valid password
  const newPassword = "newSecurePass456";

  // Small delay to ensure updated_at timestamp changes
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.users.update(connection, {
      userId: createdUser.id,
      body: {
        password: newPassword,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 3: Verify the response does not expose the password or password hash
  const userResponse = updatedUser as any;
  TestValidator.predicate(
    "response should not contain password field",
    userResponse.password === undefined,
  );
  TestValidator.predicate(
    "response should not contain password_hash field",
    userResponse.password_hash === undefined,
  );

  // Step 4: Confirm updated_at timestamp reflects the password change
  TestValidator.predicate(
    "updated_at should be changed after password update",
    new Date(updatedUser.updated_at).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );

  // Step 5: Test password minimum length requirements (8 characters)
  await TestValidator.error(
    "should reject password shorter than 8 characters",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: createdUser.id,
        body: {
          password: "short12",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 6: Validate that weak passwords are rejected (less than minimum length)
  await TestValidator.error(
    "should reject password with exactly 7 characters",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: createdUser.id,
        body: {
          password: "weak123",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Additional validation: Ensure password meets minimum length exactly at boundary
  const boundaryPassword = "pass1234";
  const boundaryUpdate: ITodoListUser =
    await api.functional.todoList.user.users.update(connection, {
      userId: createdUser.id,
      body: {
        password: boundaryPassword,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(boundaryUpdate);

  TestValidator.predicate(
    "8-character password should be accepted",
    boundaryUpdate.id === createdUser.id,
  );
}
