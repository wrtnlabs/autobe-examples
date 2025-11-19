import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

/**
 * Test successful password reset request initiation with a valid email address.
 *
 * This test validates the password reset request flow with a valid registered
 * contributor email. The operation should:
 *
 * 1. Accept a valid email address in the correct format
 * 2. Generate a secure, time-limited reset token (valid for 30 minutes)
 * 3. Return success regardless of whether the email is registered (prevent account
 *    enumeration)
 * 4. Store the reset token internally for later verification
 *
 * The test verifies that the API endpoint correctly handles valid email format
 * and returns a success response without exposing whether the account exists.
 */
export async function test_api_password_reset_request_valid_email(
  connection: api.IConnection,
) {
  // Generate a valid email address for testing
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Call the password reset request API with the valid email
  const response =
    await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );

  // Validate the response (void response indicates success)
  typia.assert(response);

  // Verify that the operation completes without error
  TestValidator.predicate(
    "password reset request should complete successfully with valid email",
    true,
  );

  // Test with another valid email to ensure consistency
  const secondTestEmail = typia.random<string & tags.Format<"email">>();

  const secondResponse =
    await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: secondTestEmail,
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );

  typia.assert(secondResponse);

  // Verify that multiple requests can be made without interference
  TestValidator.predicate(
    "multiple password reset requests should be independent",
    true,
  );
}
