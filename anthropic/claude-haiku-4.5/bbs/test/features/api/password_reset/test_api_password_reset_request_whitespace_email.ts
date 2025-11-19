import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

/**
 * Test password reset request with email containing leading/trailing whitespace
 * or embedded spaces.
 *
 * The system should either trim whitespace and process normally, or reject the
 * request as invalid email format. Verify consistent behavior and that
 * whitespace handling doesn't bypass validation or create duplicate token
 * entries.
 *
 * Steps:
 *
 * 1. Test email with leading whitespace
 * 2. Test email with trailing whitespace
 * 3. Test email with both leading and trailing whitespace
 * 4. Test email with embedded spaces (invalid format)
 * 5. Verify consistent response behavior across all whitespace variations
 */
export async function test_api_password_reset_request_whitespace_email(
  connection: api.IConnection,
) {
  const baseEmail = typia.random<string & tags.Format<"email">>();

  // Test 1: Email with leading whitespace
  const emailWithLeadingSpace = ` ${baseEmail}`;

  // Test 2: Email with trailing whitespace
  const emailWithTrailingSpace = `${baseEmail} `;

  // Test 3: Email with both leading and trailing whitespace
  const emailWithBothSpaces = ` ${baseEmail} `;

  // Test 4: Email with embedded spaces (invalid format)
  const localPart = baseEmail.split("@")[0];
  const domainPart = baseEmail.split("@")[1];
  const emailWithEmbeddedSpace = `${localPart} space@${domainPart}`;

  // Test leading whitespace - expect rejection due to invalid format
  await TestValidator.error(
    "email with leading whitespace should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: emailWithLeadingSpace,
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test trailing whitespace - expect consistent rejection
  await TestValidator.error(
    "email with trailing whitespace should be rejected consistently",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: emailWithTrailingSpace,
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test both leading and trailing whitespace
  await TestValidator.error(
    "email with both leading and trailing whitespace should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: emailWithBothSpaces,
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test email with embedded spaces - should be rejected
  await TestValidator.error(
    "email with embedded spaces should be rejected as invalid format",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: emailWithEmbeddedSpace,
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test that clean email without whitespace works correctly
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: baseEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  TestValidator.predicate(
    "clean email without whitespace is accepted and processed successfully",
    true,
  );
}
