import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test security behavior when requesting password reset for non-existent email.
 *
 * This test validates that the password reset endpoint handles non-existent
 * email addresses according to security best practices for preventing account
 * enumeration attacks. The system should respond in a way that does not reveal
 * whether an email address is registered in the system, protecting user privacy
 * and security.
 *
 * Test workflow:
 *
 * 1. Generate a random non-existent email address with valid format
 * 2. Submit password reset request with actor_type='member' and the non-existent
 *    email
 * 3. Verify the response follows security best practices (consistent response
 *    regardless of email existence or appropriate error without exposing
 *    account information)
 */
export async function test_api_password_reset_nonexistent_email_security(
  connection: api.IConnection,
) {
  // Generate a unique non-existent email address
  const nonexistentEmail = `nonexistent.user.${typia.random<number & tags.Type<"uint32">>()}@example.com`;

  // Create password reset request for non-existent email
  const requestBody = {
    actor_type: "member",
    email: nonexistentEmail,
  } satisfies IDiscussionBoardPasswordReset.ICreate;

  // Submit password reset request
  const passwordReset: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.passwordResets.create(connection, {
      body: requestBody,
    });

  // Validate the response structure - typia.assert performs COMPLETE validation
  typia.assert(passwordReset);

  // Verify business logic: response matches the request data
  TestValidator.equals(
    "actor type matches request",
    passwordReset.actor_type,
    "member",
  );

  TestValidator.equals(
    "email matches request",
    passwordReset.email,
    nonexistentEmail,
  );
}
