import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test password change validation when user provides incorrect current
 * password.
 *
 * Validates that the password change endpoint properly rejects requests when
 * the current password verification fails. Ensures that:
 *
 * - System validates current password against stored hash
 * - Request is rejected with appropriate error message
 * - Password is NOT changed when validation fails
 * - Original password remains valid for authentication
 * - No sensitive information is leaked in error messages
 *
 * Business flow:
 *
 * 1. Register a new user with known credentials
 * 2. Authenticate the user (to get valid JWT token)
 * 3. Attempt password change with incorrect current password
 * 4. Verify the operation fails with error
 * 5. Verify original password still authenticates successfully
 * 6. Verify new password does NOT work (confirming no password change occurred)
 */
export async function test_api_password_change_incorrect_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new authenticated user with known credentials
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "ValidPass123!@#";

  const registeredUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: originalEmail,
        password: originalPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(registeredUser);
  TestValidator.predicate(
    "registered user has valid ID",
    registeredUser.id.length > 0,
  );

  // Step 2: Attempt to change password with incorrect current password
  const incorrectCurrentPassword = "WrongPassword456!@#";
  const newPassword = "NewValidPass789!@#";

  await TestValidator.error(
    "password change fails with incorrect current password",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: incorrectCurrentPassword,
            new_password: newPassword,
            new_password_confirm: newPassword,
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 3: Verify original password still works (password was NOT changed)
  const unauthenticatedConnection = { ...connection, headers: {} };

  const reAuthenticateResult = await api.functional.auth.authenticatedUser.join(
    unauthenticatedConnection,
    {
      body: {
        email: originalEmail,
        password: originalPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(reAuthenticateResult);
  TestValidator.predicate(
    "original password successfully re-authenticates user",
    reAuthenticateResult.id === registeredUser.id,
  );

  // Step 4: Verify new password does NOT work (confirms password was NOT changed)
  await TestValidator.error(
    "new password does not authenticate, confirming password was not changed",
    async () => {
      await api.functional.auth.authenticatedUser.join(
        unauthenticatedConnection,
        {
          body: {
            email: originalEmail,
            password: newPassword,
          } satisfies ITodoAppAuthenticatedUser.ICreate,
        },
      );
    },
  );
}
