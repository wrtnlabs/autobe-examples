import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset token reuse prevention.
 *
 * This test validates that password reset tokens cannot be reused after being
 * consumed. Due to API limitations (no test endpoint to retrieve tokens), this
 * test demonstrates the password reset request flow and validates error
 * handling for invalid tokens.
 *
 * Note: Full token reuse testing requires either database access or a test-only
 * endpoint to retrieve generated tokens, which are not available in the current
 * API.
 *
 * Steps:
 *
 * 1. Create a moderator account
 * 2. Request password reset (generates token sent to email)
 * 3. Attempt to use an invalid/non-existent token (simulates already-used
 *    scenario)
 * 4. Validate that invalid tokens are rejected
 */
export async function test_api_moderator_password_reset_confirm_already_used_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "original_password_123";

  const moderatorData = {
    email: moderatorEmail,
    password: originalPassword,
    username:
      RandomGenerator.name(1) +
      typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>(),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Request password reset token
  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: moderatorEmail,
      } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
    },
  );

  // Step 3: Attempt to reset password with an invalid token
  // This simulates an already-used or expired token scenario
  // In reality, we cannot access the actual token without database access or email interception
  const invalidToken = typia.random<string & tags.Format<"uuid">>();
  const newPassword = "new_password_456_secure";

  await TestValidator.error(
    "should reject invalid or already-used token",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: invalidToken,
            password: newPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );

  // Additional test: Verify that using a non-existent token fails
  const anotherInvalidToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("should reject another invalid token", async () => {
    await api.functional.auth.moderator.password.reset.confirm.resetPassword(
      connection,
      {
        body: {
          token: anotherInvalidToken,
          password: "another_password_789",
        } satisfies IDiscussionBoardModerator.IResetPassword,
      },
    );
  });
}
