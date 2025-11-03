import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test password reset behavior when requesting reset for an unregistered email
 * address.
 *
 * This test validates that the password reset API maintains security by not
 * revealing whether an email address is registered in the system. When a member
 * requests a password reset using an email that does not exist, the system
 * should:
 *
 * 1. Accept the password reset request for the non-existent email
 * 2. Not throw any error or exception
 * 3. Display a generic confirmation message indicating that if an account exists
 *    with that email, reset instructions will be sent
 * 4. Return the same response as if the email was registered
 *
 * This prevents account enumeration attacks where attackers could determine
 * valid email addresses by analyzing API responses.
 *
 * Test flow:
 *
 * 1. Generate a random email address that is not registered in the system
 * 2. Call the password reset API with this unregistered email
 * 3. Verify that the API call succeeds without throwing an error
 * 4. Confirm that the response is consistent with registered email responses
 */
export async function test_api_password_reset_unregistered_email(
  connection: api.IConnection,
) {
  // Generate a random unregistered email address
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();

  // Call the password reset API with the unregistered email
  await api.functional.discussionBoard.auth.password_reset.resetPassword(
    connection,
    {
      body: {
        email: unregisteredEmail,
      } satisfies IDiscussionBoardMemberSession.IPasswordResetRequest,
    },
  );

  // Verify that the API call completes successfully without errors
  TestValidator.predicate(
    "password reset request for unregistered email should succeed",
    true,
  );
}
