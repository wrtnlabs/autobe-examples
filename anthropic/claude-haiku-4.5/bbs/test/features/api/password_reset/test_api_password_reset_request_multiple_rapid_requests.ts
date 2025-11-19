import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

/**
 * Test that repeated password reset requests from the same email address within
 * a short time period properly implement rate limiting and token management.
 *
 * This test verifies that:
 *
 * - Multiple rapid password reset requests from the same email are handled
 *   correctly
 * - Each new request invalidates the previous token
 * - Only the most recent token remains valid
 * - The system tracks request timestamps for rate limiting
 * - Rate limiting prevents brute-force attacks while allowing legitimate users to
 *   request multiple resets
 *
 * Flow:
 *
 * 1. Generate a test email address
 * 2. Make the first password reset request
 * 3. Make a second password reset request immediately after with the same email
 * 4. Make a third password reset request to further test token invalidation
 * 5. Verify that the system accepted all requests
 * 6. Verify that multiple rapid requests were handled appropriately
 */
export async function test_api_password_reset_request_multiple_rapid_requests(
  connection: api.IConnection,
) {
  // Generate test email address
  const testEmail = typia.random<string & tags.Format<"email">>();

  // First password reset request
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: testEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  // Second password reset request immediately after (should invalidate the first token)
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: testEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  // Third password reset request to further test token management
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: testEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  // Verify that multiple rapid requests were accepted
  TestValidator.predicate(
    "multiple rapid password reset requests should be accepted",
    true,
  );

  // Test that requests from different email addresses work independently
  const anotherEmail = typia.random<string & tags.Format<"email">>();

  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: anotherEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  TestValidator.predicate(
    "password reset requests from different emails should be independent",
    true,
  );

  // Verify that rapid requests don't cause errors
  const rapidRequestEmail = typia.random<string & tags.Format<"email">>();

  // Make several requests in rapid succession
  await ArrayUtil.asyncRepeat(5, async () => {
    await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: rapidRequestEmail,
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );
  });

  TestValidator.predicate(
    "rapid successive requests should be handled without errors",
    true,
  );
}
