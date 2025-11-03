import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetRequest";
import type { ITodoAppAuthPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetResponse";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password reset request initiation phase.
 *
 * This test validates the password reset request initiation workflow where a
 * user provides their registered email address to request password reset
 * instructions. The system generates a secure password reset token with 1-hour
 * expiration, sends it via email, and returns a generic confirmation message
 * without revealing whether the email exists in the system for security
 * purposes (preventing email enumeration attacks).
 *
 * Test flow:
 *
 * 1. Create a new user account with a registered email address
 * 2. Initiate a password reset request by sending the user's email
 * 3. Verify the API returns a generic success response
 * 4. Validate that the response includes appropriate messaging about password
 *    reset instructions
 * 5. Ensure the response does not reveal email enumeration information
 * 6. Verify response structure contains all required fields
 */
export async function test_api_password_reset_request_initiation(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with registered email address for password reset testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(createdUser);
  TestValidator.equals(
    "created user email matches",
    createdUser.email,
    userEmail,
  );

  // Step 2: Initiate password reset request by sending the registered email
  const resetRequest =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        email: userEmail,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });
  typia.assert(resetRequest);

  // Step 3: Verify the response is a success confirmation
  TestValidator.predicate(
    "password reset initiation success",
    resetRequest.success === true,
  );

  // Step 4: Validate response message indicates instructions were sent
  TestValidator.predicate(
    "response message contains reference to email check",
    resetRequest.message.toLowerCase().includes("email") ||
      resetRequest.message.toLowerCase().includes("check"),
  );

  // Step 5: Verify status code indicates email-based reset was initiated
  TestValidator.predicate(
    "status code indicates password reset email sent",
    resetRequest.status_code === "PASSWORD_RESET_EMAIL_SENT" ||
      resetRequest.status_code.includes("EMAIL"),
  );

  // Step 6: Validate recovery action suggests checking email
  TestValidator.predicate(
    "recovery action suggests checking email",
    resetRequest.recovery_action === "check_email",
  );

  // Step 7: Test with non-existent email - should return same generic message for security
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const resetRequestNonExistent =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        email: nonExistentEmail,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });
  typia.assert(resetRequestNonExistent);

  // Step 8: Verify generic response for non-existent email (prevents email enumeration)
  TestValidator.predicate(
    "non-existent email returns generic success response",
    resetRequestNonExistent.success === true,
  );

  // Step 9: Verify both responses have consistent structure and messaging
  TestValidator.predicate(
    "response structure is consistent",
    typeof resetRequest.message === "string" &&
      typeof resetRequest.status_code === "string" &&
      typeof resetRequest.recovery_action === "string" &&
      typeof resetRequestNonExistent.message === "string" &&
      typeof resetRequestNonExistent.status_code === "string" &&
      typeof resetRequestNonExistent.recovery_action === "string",
  );
}
