import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test password reset request for non-existent moderator email.
 *
 * This test validates security measures against account enumeration attacks by
 * verifying that the password reset endpoint returns a consistent generic
 * success response regardless of whether the provided email exists in the
 * database.
 *
 * Steps:
 *
 * 1. Generate a random email address that does not exist in the system
 * 2. Submit a password reset request with the non-existent email
 * 3. Verify the response indicates success with a generic message
 * 4. Confirm the response structure matches expected format
 *
 * This ensures attackers cannot determine which emails have moderator accounts
 * by observing different response patterns.
 */
export async function test_api_moderator_password_reset_request_for_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Submit password reset request with non-existent email
  const response: IRedditLikeModerator.IPasswordResetResponse =
    await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IRedditLikeModerator.IPasswordResetRequest,
      },
    );

  // Validate response structure
  typia.assert(response);

  // Verify success flag is true (generic success response)
  TestValidator.equals(
    "response success flag should be true",
    response.success,
    true,
  );

  // Verify message is a non-empty string (generic confirmation message)
  TestValidator.predicate(
    "response message should be a non-empty string",
    typeof response.message === "string" && response.message.length > 0,
  );
}
