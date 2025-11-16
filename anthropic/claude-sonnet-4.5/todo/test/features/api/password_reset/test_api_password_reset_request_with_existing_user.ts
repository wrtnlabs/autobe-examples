import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request for an existing user account.
 *
 * This test validates the complete password reset request workflow:
 *
 * 1. Create a new user account with valid credentials
 * 2. Request a password reset using the user's email address
 * 3. Verify that the system accepts the request and returns a success message
 *
 * The test ensures that the password reset token generation process works
 * correctly for legitimate user accounts and that the API returns the expected
 * confirmation response without revealing whether the email exists in the
 * system (following security best practices against email enumeration
 * attacks).
 */
export async function test_api_password_reset_request_with_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: undefined,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Verify the user was created successfully
  TestValidator.equals(
    "created user email matches",
    createdUser.email,
    userEmail,
  );

  // Step 2: Request password reset for the existing user
  const resetRequestBody = {
    email: userEmail,
  } satisfies ITodoListPasswordReset.IRequest;

  const resetResult: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResult);

  // Step 3: Verify the response contains a confirmation message
  TestValidator.predicate(
    "reset result contains message",
    resetResult.message !== null &&
      resetResult.message !== undefined &&
      resetResult.message.length > 0,
  );
}
