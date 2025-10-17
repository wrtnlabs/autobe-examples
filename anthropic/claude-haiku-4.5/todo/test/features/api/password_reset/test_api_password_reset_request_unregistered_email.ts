import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";

export async function test_api_password_reset_request_unregistered_email(
  connection: api.IConnection,
) {
  /**
   * Test password reset request with unregistered email.
   *
   * Verifies that the system returns a generic success message for unregistered
   * emails, preventing user enumeration attacks. The system should not reveal
   * whether an email address is registered in the system, maintaining identical
   * behavior and response times for both valid and invalid emails.
   */

  // Generate a unique email address that is extremely unlikely to be registered
  const unregisteredEmail =
    `test-nonexistent-${RandomGenerator.alphaNumeric(16)}@nonexistent-domain-${RandomGenerator.alphaNumeric(8)}.invalid` satisfies string;

  // Test 1: Request password reset with unregistered email
  const response1: ITodoAppAuth.IRequestPasswordResetResponse =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unregisteredEmail,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(response1);

  // Validate response structure and content
  TestValidator.predicate(
    "response should contain message property",
    typeof response1.message === "string" && response1.message.length > 0,
  );

  TestValidator.predicate(
    "response message should be generic and not reveal email status",
    response1.message.includes("If an account exists") ||
      response1.message.includes("check your inbox") ||
      response1.message.includes("shortly") ||
      response1.message.includes("account") ||
      response1.message.includes("email"),
  );

  TestValidator.predicate(
    "response message should NOT contain error indicators for non-existent email",
    !response1.message.toLowerCase().includes("not found") &&
      !response1.message.toLowerCase().includes("does not exist") &&
      !response1.message.toLowerCase().includes("no account") &&
      !response1.message.toLowerCase().includes("invalid email") &&
      !response1.message.toLowerCase().includes("error") &&
      !response1.message.toLowerCase().includes("failed"),
  );

  // Test 2: Request with another unregistered email to verify consistent behavior
  const unregisteredEmail2 =
    `another-nonexistent-${RandomGenerator.alphaNumeric(16)}@nonexistent-${RandomGenerator.alphaNumeric(8)}.invalid` satisfies string;

  const response2: ITodoAppAuth.IRequestPasswordResetResponse =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unregisteredEmail2,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(response2);

  // Verify responses are identical (same generic message)
  TestValidator.equals(
    "both unregistered email requests should return identical generic messages",
    response1.message,
    response2.message,
  );

  // Test 3: Request with unregistered email containing special characters (edge case)
  const unregisteredEmail3 =
    `test+special-${RandomGenerator.alphaNumeric(8)}@nonexistent-test-${RandomGenerator.alphaNumeric(6)}.invalid` satisfies string;

  const response3: ITodoAppAuth.IRequestPasswordResetResponse =
    await api.functional.todoApp.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unregisteredEmail3,
        } satisfies ITodoAppAuth.IRequestPasswordResetRequest,
      },
    );
  typia.assert(response3);

  // All unregistered emails should receive the same message
  TestValidator.equals(
    "special character email should also return generic message",
    response1.message,
    response3.message,
  );

  // Test 4: Verify message is appropriate for privacy protection
  TestValidator.predicate(
    "message should indicate email will be sent if account exists (privacy-conscious)",
    response1.message.toLowerCase().includes("if") &&
      response1.message.toLowerCase().includes("exist"),
  );
}
