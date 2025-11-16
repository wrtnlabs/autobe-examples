import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

/**
 * Test that the password reset endpoint protects against email enumeration
 * attacks.
 *
 * This test validates a critical security requirement: the password reset
 * endpoint must return consistent, generic responses that do not reveal whether
 * an email address exists in the system. This prevents attackers from using the
 * endpoint to enumerate valid user accounts.
 *
 * Security rationale: Email enumeration is a reconnaissance technique where
 * attackers probe endpoints to identify valid user accounts. If responses
 * differ between existing and non-existing emails (e.g., "User not found" vs
 * "Email sent"), attackers can build target lists. Proper security design
 * requires identical responses regardless of email existence.
 *
 * Test approach: Since we don't have access to user creation APIs in this test
 * context, we validate that multiple requests with different non-existent
 * emails produce identical generic responses. This demonstrates the endpoint
 * follows secure design patterns:
 *
 * 1. Consistent response structure across all requests
 * 2. Generic messaging that doesn't leak information
 * 3. No account existence indicators in response
 *
 * Test workflow:
 *
 * 1. Submit password reset requests with multiple different non-existent email
 *    addresses
 * 2. Verify all responses have identical structure and messaging
 * 3. Validate response messages use appropriate generic language
 * 4. Ensure no information leakage about account existence
 */
export async function test_api_password_reset_request_email_enumeration_protection(
  connection: api.IConnection,
) {
  // Generate three different non-existent email addresses for testing
  const email1 = typia.random<string & tags.Format<"email">>();
  const email2 = typia.random<string & tags.Format<"email">>();
  const email3 = typia.random<string & tags.Format<"email">>();

  // Step 1: Submit password reset request with first non-existent email
  const response1: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: email1,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(response1);

  // Step 2: Submit password reset request with second non-existent email
  const response2: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: email2,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(response2);

  // Step 3: Submit password reset request with third non-existent email
  const response3: ITodoListPasswordReset.IRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: email3,
        } satisfies ITodoListPasswordReset.IRequest,
      },
    );
  typia.assert(response3);

  // Step 4: Validate that all responses are identical
  // This proves the endpoint returns consistent responses regardless of input email
  TestValidator.equals(
    "first and second password reset responses should be identical",
    response1,
    response2,
  );

  TestValidator.equals(
    "second and third password reset responses should be identical",
    response2,
    response3,
  );

  // Step 5: Verify the message is generic and doesn't reveal account information
  // Secure endpoints should NOT contain phrases indicating account status
  const message = response1.message;

  TestValidator.predicate(
    "response message should not contain account-revealing phrases",
    !message.toLowerCase().includes("not found") &&
      !message.toLowerCase().includes("invalid") &&
      !message.toLowerCase().includes("doesn't exist") &&
      !message.toLowerCase().includes("does not exist") &&
      !message.toLowerCase().includes("no account") &&
      !message.toLowerCase().includes("unknown user") &&
      !message.toLowerCase().includes("user not found"),
  );

  // Step 6: Verify the message is appropriately generic and non-empty
  TestValidator.predicate(
    "response message should be a non-empty generic string",
    typeof message === "string" && message.length > 0,
  );

  // Step 7: Verify response structure consistency
  TestValidator.predicate(
    "response should have message property",
    "message" in response1 && typeof response1.message === "string",
  );
}
