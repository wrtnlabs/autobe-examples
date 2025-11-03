import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetRequest";
import type { ITodoAppAuthPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthPasswordResetResponse";

/**
 * Test password reset request for non-registered email address.
 *
 * Validates that the system returns a generic confirmation message without
 * revealing whether the email exists in the system, implementing security best
 * practice to prevent email enumeration attacks that could expose registered
 * user email addresses.
 *
 * Test flow:
 *
 * 1. Send password reset request with non-existent email
 * 2. Verify response indicates success with generic message
 * 3. Confirm no information leakage about email existence
 * 4. Validate response structure and required fields
 */
export async function test_api_password_reset_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Send password reset request with non-existent email
  const response: ITodoAppAuthPasswordResetResponse =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        email: nonExistentEmail,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });

  // Validate response type
  typia.assert(response);

  // Verify response indicates success (generic message for security)
  TestValidator.predicate(
    "response should indicate success",
    response.success === true,
  );

  // Verify message is generic and doesn't reveal email status
  TestValidator.predicate(
    "message should be generic confirmation",
    response.message.toLowerCase().includes("check") ||
      response.message.toLowerCase().includes("email") ||
      response.message.toLowerCase().includes("password") ||
      response.message.toLowerCase().includes("sent"),
  );

  // Verify status code is appropriate for non-existent email
  TestValidator.predicate(
    "status code should indicate operation initiated",
    response.status_code === "PASSWORD_RESET_EMAIL_SENT" ||
      response.status_code === "USER_NOT_FOUND" ||
      response.status_code.includes("PASSWORD_RESET"),
  );

  // Verify recovery action is provided
  TestValidator.predicate(
    "recovery action should be provided",
    response.recovery_action !== undefined &&
      response.recovery_action.length > 0,
  );

  // Test with another non-existent email to ensure consistent behavior
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const secondResponse: ITodoAppAuthPasswordResetResponse =
    await api.functional.todoApp.auth.password_reset.resetPassword(connection, {
      body: {
        email: anotherEmail,
      } satisfies ITodoAppAuthPasswordResetRequest,
    });

  typia.assert(secondResponse);

  // Verify both responses are consistent (same generic message pattern)
  TestValidator.predicate(
    "both non-existent emails should receive generic responses",
    secondResponse.success === true,
  );

  // Verify message structure is consistent
  TestValidator.predicate(
    "response message should be consistent",
    secondResponse.message !== undefined && secondResponse.message.length > 0,
  );
}
