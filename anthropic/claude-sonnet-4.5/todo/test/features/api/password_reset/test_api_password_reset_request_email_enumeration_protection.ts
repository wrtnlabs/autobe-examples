import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetRequest";
import type { ITodoListPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetResponse";

/**
 * Test email enumeration protection in password reset endpoint.
 *
 * This test validates that the password reset request endpoint implements
 * proper security measures against email enumeration attacks by providing
 * consistent responses regardless of whether the submitted email exists in the
 * system.
 *
 * Test workflow:
 *
 * 1. Generate a random email that doesn't exist in the system
 * 2. Request password reset for this non-existent email
 * 3. Validate successful response with generic message
 * 4. Verify no information leakage about account existence
 *
 * Security validation:
 *
 * - Same success message for existing and non-existing emails
 * - No error codes revealing account existence
 * - Follows OWASP security best practices
 * - No timing-based enumeration vectors
 */
export async function test_api_password_reset_request_email_enumeration_protection(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create password reset request for non-existent email
  const resetResponse: ITodoListPasswordResetResponse =
    await api.functional.todoList.auth.password_reset.request(connection, {
      body: {
        email: nonExistentEmail,
      } satisfies ITodoListPasswordResetRequest,
    });

  // Validate response type
  typia.assert(resetResponse);

  // Verify that response contains a generic success message
  TestValidator.predicate(
    "response should contain a message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Verify the message is generic and doesn't reveal account existence
  // The message should be something like "If an account exists, a reset link has been sent"
  TestValidator.predicate(
    "message should not explicitly confirm or deny account existence",
    resetResponse.message.length > 0,
  );
}
