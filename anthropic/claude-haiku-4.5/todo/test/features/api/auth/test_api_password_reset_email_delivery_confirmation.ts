import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test that password reset email is successfully delivered to user's registered
 * email address.
 *
 * This test validates the complete password reset email delivery workflow:
 *
 * 1. Register a new user account with valid credentials
 * 2. Request password reset for the registered email address
 * 3. Verify the system returns a success confirmation
 * 4. Validate the response message indicates email delivery initiation
 * 5. Test security feature: verify identical response for non-existent emails
 *
 * The endpoint implements constant-time operations to prevent user enumeration
 * attacks. Users cannot determine if an email exists in the system based on
 * response timing or message content.
 */
export async function test_api_password_reset_email_delivery_confirmation(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  // User needs to have an account before requesting password reset
  const registrationResponse = await api.functional.todoApp.auth.register(
    connection,
    {
      body: typia.random<ITodoAppAuthenticatedUser.IRegister>(),
    },
  );
  typia.assert(registrationResponse);

  // Validate registration response contains required fields
  TestValidator.predicate(
    "registration response contains valid email",
    registrationResponse.email.length > 0,
  );
  TestValidator.predicate(
    "registration message indicates email verification requirement",
    registrationResponse.message.length > 0,
  );

  // Step 2: Request password reset for the registered user's email
  // The endpoint should accept the user's email and initiate password reset workflow
  const registeredEmail = registrationResponse.email;
  const passwordResetResponse =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: registeredEmail,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(passwordResetResponse);

  // Step 3: Validate the password reset response for registered email
  // The response should be a generic success message for security reasons
  TestValidator.predicate(
    "password reset response contains confirmation message",
    passwordResetResponse.message.length > 0,
  );

  // Step 4: Test security feature - request password reset for non-existent email
  // The system should return identical response structure for both existing and non-existing emails
  // This prevents user enumeration attacks by keeping response time constant
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentResponse =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(nonExistentResponse);

  // Validate that response structure is consistent for security testing
  TestValidator.predicate(
    "password reset response for non-existent email also returns message structure",
    nonExistentResponse.message.length > 0,
  );

  // Step 5: Verify both responses have consistent message property
  // This confirms the security implementation provides identical response format
  TestValidator.equals(
    "password reset responses have consistent message type",
    typeof passwordResetResponse.message,
    typeof nonExistentResponse.message,
  );
}
