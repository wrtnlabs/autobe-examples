import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request creation and basic token validation workflow.
 *
 * This test validates the password reset request process where a user initiates
 * a password reset and the system generates a reset token. Due to API security
 * design (the reset ID is not returned in the response to prevent email
 * enumeration), this test focuses on the request creation phase.
 *
 * In a real-world scenario, the reset ID would be delivered via email link, and
 * the user would access it through that channel before retrieving token
 * details.
 *
 * Test workflow:
 *
 * 1. Register a new user account
 * 2. Request a password reset for the account
 * 3. Validate the password reset request was processed successfully
 *
 * Note: Full end-to-end token retrieval testing requires the reset ID from the
 * email system, which is outside the scope of this API test.
 */
export async function test_api_password_reset_user_verify_token_details(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Verify user was created successfully
  TestValidator.predicate(
    "user should have a valid UUID",
    typeof user.id === "string" && user.id.length > 0,
  );

  TestValidator.equals(
    "user email should match registration email",
    user.email,
    userEmail,
  );

  // Step 2: Request password reset for the user account
  const resetRequestBody = {
    email: userEmail,
  } satisfies ITodoListPasswordReset.IRequest;

  const resetResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResult);

  // Step 3: Validate that the reset request was acknowledged
  TestValidator.predicate(
    "reset request should return a confirmation message",
    typeof resetResult.message === "string" && resetResult.message.length > 0,
  );

  // The password reset flow is complete at this point from the API perspective.
  // In production, the user would receive an email with a reset link containing
  // the reset ID, which they would use to retrieve token details and reset their password.
}
