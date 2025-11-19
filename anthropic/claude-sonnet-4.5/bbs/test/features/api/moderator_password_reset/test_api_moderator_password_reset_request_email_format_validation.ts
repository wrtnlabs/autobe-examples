import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset request with invalid email formats to verify input
 * validation.
 *
 * This test validates that the moderator password reset request endpoint
 * properly enforces email format validation as specified by the
 * tags.Format<"email"> constraint in the
 * IDiscussionBoardModerator.IRequestPasswordReset DTO.
 *
 * The test submits requests with various invalid email formats including:
 *
 * - Missing @ symbol
 * - Multiple @ symbols
 * - Missing domain
 * - Invalid characters (whitespace)
 * - Empty string
 * - No domain component
 *
 * Each invalid email should be rejected with a validation error before
 * processing.
 */
export async function test_api_moderator_password_reset_request_email_format_validation(
  connection: api.IConnection,
) {
  // Test case 1: Missing @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "userexample.com",
          } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
        },
      );
    },
  );

  // Test case 2: Multiple @ symbols
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "user@@example.com",
          } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
        },
      );
    },
  );

  // Test case 3: Missing domain after @
  await TestValidator.error(
    "should reject email with missing domain",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "user@",
          } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
        },
      );
    },
  );

  // Test case 4: Invalid characters (whitespace)
  await TestValidator.error("should reject email with whitespace", async () => {
    await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: "user name@example.com",
        } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
      },
    );
  });

  // Test case 5: Empty string
  await TestValidator.error("should reject empty email string", async () => {
    await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: "",
        } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
      },
    );
  });

  // Test case 6: No @ symbol and no domain
  await TestValidator.error(
    "should reject email without @ and domain",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "notanemail",
          } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
        },
      );
    },
  );

  // Test case 7: Missing local part (before @)
  await TestValidator.error(
    "should reject email with missing local part",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "@example.com",
          } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
        },
      );
    },
  );

  // Test case 8: Invalid domain (no TLD)
  await TestValidator.error(
    "should reject email with invalid domain",
    async () => {
      await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: "user@domain",
          } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
        },
      );
    },
  );
}
