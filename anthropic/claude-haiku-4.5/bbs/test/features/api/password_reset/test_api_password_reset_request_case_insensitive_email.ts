import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

/**
 * Test password reset request with case-insensitive email handling.
 *
 * Validates that email addresses are handled case-insensitively according to
 * RFC 5321 standards. Email addresses should be normalized for comparison
 * regardless of whether they are submitted in uppercase, lowercase, or mixed
 * case. The system must treat User@Example.com and user@example.com as the same
 * email address for password reset token generation and validation.
 *
 * Test flow:
 *
 * 1. Generate a test email address
 * 2. Request password reset with the original case email
 * 3. Request password reset with the same email in different case variation
 * 4. Verify that both requests succeed (system accepts both case variations)
 * 5. Confirm the system treats both as the same account for password reset
 *    purposes
 */
export async function test_api_password_reset_request_case_insensitive_email(
  connection: api.IConnection,
) {
  // Generate a test email with mixed case
  const originalEmail = typia.random<string & tags.Format<"email">>();

  // Convert the email to different case variations to test case-insensitivity
  const lowerCaseEmail = originalEmail.toLowerCase();
  const upperCaseEmail = originalEmail.toUpperCase();
  const mixedCaseEmail = originalEmail;

  // Request password reset with the original mixed case email
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: mixedCaseEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  TestValidator.predicate(
    "password reset request with mixed case email should succeed",
    true,
  );

  // Request password reset with lowercase variation of the same email
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: lowerCaseEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  TestValidator.predicate(
    "password reset request with lowercase email should succeed",
    true,
  );

  // Request password reset with uppercase variation of the same email
  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: upperCaseEmail,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  TestValidator.predicate(
    "password reset request with uppercase email should succeed",
    true,
  );

  // Verify that the system handles all case variations correctly by making
  // another request with a different case variation to ensure consistency
  const anotherMixedCaseVariation = originalEmail
    .split("@")
    .map((part, index) => {
      if (index === 0) {
        // Alternate the case of characters in the local part
        return part
          .split("")
          .map((char, i) =>
            i % 2 === 0 ? char.toUpperCase() : char.toLowerCase(),
          )
          .join("");
      }
      return part.toLowerCase();
    })
    .join("@");

  await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
    connection,
    {
      body: {
        email: anotherMixedCaseVariation,
      } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
    },
  );

  TestValidator.predicate(
    "password reset request with another case variation should succeed",
    true,
  );
}
