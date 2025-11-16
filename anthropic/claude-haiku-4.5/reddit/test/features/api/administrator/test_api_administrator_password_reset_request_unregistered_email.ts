import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Test password reset request security implementation for unregistered email.
 *
 * Validates that the password reset request endpoint returns a generic success
 * message regardless of whether the email address is registered as an
 * administrator account. This security feature prevents attackers from using
 * the endpoint to enumerate which email addresses have administrator accounts.
 *
 * The test submits a password reset request with an unregistered email address
 * and verifies that:
 *
 * 1. The API returns HTTP 200 (success)
 * 2. The response contains a generic success message
 * 3. The message does not reveal whether the email exists
 * 4. The response structure matches the expected format
 *
 * Security Principle: Information Hiding By returning the same response for
 * both registered and unregistered emails, the system prevents email
 * enumeration attacks that could be used to identify administrator accounts in
 * the system.
 */
export async function test_api_administrator_password_reset_request_unregistered_email(
  connection: api.IConnection,
) {
  // Generate an unregistered email address that definitely doesn't exist
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with unregistered email
  const response: ICommunityPlatformAdministrator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: unregisteredEmail,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
      },
    );

  // Validate response structure
  typia.assert(response);

  // Validate that response contains the generic success message
  TestValidator.predicate(
    "response message should exist and be a string",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Validate the message contains the key security phrase indicating generic response
  TestValidator.predicate(
    "message should be generic and not reveal email existence",
    response.message.toLowerCase().includes("if this email exists"),
  );

  // Verify message mentions sending to the provided email
  TestValidator.predicate(
    "message should indicate email would be sent if it exists",
    response.message.toLowerCase().includes("password reset"),
  );

  // Test with another unregistered email to ensure consistent behavior
  const anotherUnregisteredEmail = typia.random<
    string & tags.Format<"email">
  >();

  const response2: ICommunityPlatformAdministrator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: anotherUnregisteredEmail,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
      },
    );

  typia.assert(response2);

  // Verify both responses have the same generic message
  TestValidator.equals(
    "both unregistered emails should receive identical generic response messages",
    response.message,
    response2.message,
  );
}
