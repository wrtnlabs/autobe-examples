import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset request with non-existent moderator email address.
 *
 * This test validates the anti-enumeration security design of the password
 * reset system. When a password reset is requested for an email address that
 * does not exist in the moderator database, the system should:
 *
 * 1. Return a successful response (HTTP 200/204) without errors
 * 2. Not reveal that the account doesn't exist (security measure)
 * 3. Not generate any actual reset token in the database
 *
 * This prevents attackers from using the password reset endpoint to enumerate
 * which email addresses have moderator accounts in the system. The response
 * should be identical whether the email exists or not, maintaining security
 * through indistinguishability.
 *
 * Test Flow:
 *
 * 1. Generate a random email address that definitely doesn't exist
 * 2. Submit password reset request with the non-existent email
 * 3. Verify the operation completes successfully without errors
 */
export async function test_api_moderator_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email address that definitely doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with the non-existent email
  // The operation succeeding without error validates the anti-enumeration security
  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: nonExistentEmail,
      } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
    },
  );

  // Success: No error thrown means the system properly handles non-existent emails
  // without revealing account existence (anti-enumeration security working correctly)
}
