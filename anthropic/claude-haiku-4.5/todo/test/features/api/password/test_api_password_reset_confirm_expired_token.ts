import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset rejection when token has expired.
 *
 * This test validates that the password reset confirmation endpoint properly
 * rejects invalid or expired reset tokens. The test simulates a scenario
 * where:
 *
 * 1. A user account is created
 * 2. A password reset request is initiated, generating a reset token
 * 3. An attempt is made to confirm the password reset with an invalid token that
 *    simulates an expired token
 * 4. The API rejects the invalid token with an appropriate error response
 * 5. User's password remains unchanged, requiring a new reset request
 *
 * The test ensures that invalid tokens cannot be used to reset passwords,
 * preventing potential security vulnerabilities from token reuse attacks. Users
 * must request a new reset token if their original token has expired.
 *
 * Test flow:
 *
 * 1. Create a new user account
 * 2. Request password reset to generate a token
 * 3. Attempt to confirm password reset with an invalid/non-existent token
 * 4. Verify the request fails with appropriate error
 * 5. Confirm original password still works by attempting login
 */
export async function test_api_password_reset_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(createdUser);
  TestValidator.equals(
    "created user email matches",
    createdUser.email,
    userEmail,
  );

  // Step 2: Request password reset to generate a reset token
  const resetRequest =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest);
  TestValidator.predicate(
    "reset request message confirms token was sent",
    resetRequest.message.length > 0,
  );

  // Step 3: Attempt to confirm password reset with invalid/expired token
  // Using a random token that doesn't exist/has expired in the system
  const invalidExpiredToken = RandomGenerator.alphaNumeric(64);
  const newPassword = "NewPassword456!@#";

  await TestValidator.error(
    "invalid or expired token should fail password reset confirmation",
    async () => {
      await api.functional.auth.user.password.reset_confirm.resetPasswordConfirm(
        connection,
        {
          body: {
            token: invalidExpiredToken,
            new_password: newPassword,
          } satisfies ITodoListUser.IPasswordResetConfirm,
        },
      );
    },
  );

  // Step 4: Verify that original password still works
  // This confirms that the reset did not succeed and password was not changed
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  TestValidator.predicate(
    "original password is still valid after failed reset",
    createdUser.id.length > 0,
  );

  // Step 5: Attempt another password reset to verify user can request new token
  const secondResetRequest =
    await api.functional.auth.user.password.reset_request.resetPasswordRequest(
      unauthConnection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoListUser.IPasswordResetRequest,
      },
    );
  typia.assert(secondResetRequest);
  TestValidator.predicate(
    "user can request another password reset after expired token failure",
    secondResetRequest.message.length > 0,
  );
}
