import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordResetRequest";

/**
 * Test password reset request with invalid email formats
 *
 * Validates that the password reset request endpoint properly rejects email
 * addresses with invalid formats such as missing @ symbol, missing domain,
 * invalid characters, or malformed addresses. The system should apply strict
 * email validation before attempting any database operations.
 *
 * Test cases include:
 *
 * 1. Email without @ symbol
 * 2. Email with multiple @ symbols
 * 3. Email with missing local part
 * 4. Email with missing domain
 * 5. Email with spaces
 * 6. Email with invalid characters
 * 7. Empty email string
 * 8. Email with only spaces
 *
 * This ensures email format validation is enforced at the API layer.
 */
export async function test_api_password_reset_request_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Email without @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: "invalidemail.com",
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test 2: Email with multiple @ symbols
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: "user@@example.com",
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test 3: Email with missing local part
  await TestValidator.error(
    "should reject email with missing local part",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: "@example.com",
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test 4: Email with missing domain
  await TestValidator.error(
    "should reject email with missing domain",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: "user@",
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test 5: Email with spaces
  await TestValidator.error("should reject email with spaces", async () => {
    await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: "user @example.com",
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );
  });

  // Test 6: Email with invalid characters
  await TestValidator.error(
    "should reject email with invalid characters",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: "user<>@example.com",
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );

  // Test 7: Empty email string
  await TestValidator.error("should reject empty email string", async () => {
    await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: "",
        } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
      },
    );
  });

  // Test 8: Email with only spaces
  await TestValidator.error(
    "should reject email with only spaces",
    async () => {
      await api.functional.discussionBoard.auth.request_password_reset.requestPasswordReset(
        connection,
        {
          body: {
            email: "   ",
          } satisfies IDiscussionBoardPasswordResetRequest.ICreate,
        },
      );
    },
  );
}
