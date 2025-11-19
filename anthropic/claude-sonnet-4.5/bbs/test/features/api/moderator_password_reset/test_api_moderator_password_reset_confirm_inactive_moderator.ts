import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset confirmation with invalid reset token.
 *
 * This test validates that the password reset confirmation endpoint properly
 * rejects password reset attempts using invalid or non-existent reset tokens.
 * This is a critical security test to ensure unauthorized password changes
 * cannot occur.
 *
 * Workflow:
 *
 * 1. Create a new moderator account through registration
 * 2. Request password reset to ensure the account exists and is valid
 * 3. Attempt to confirm password reset with an invalid/random token
 * 4. Verify that the operation fails with an appropriate error
 *
 * This ensures the system properly validates reset tokens and prevents
 * unauthorized password changes.
 */
export async function test_api_moderator_password_reset_confirm_inactive_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePassword123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: originalPassword,
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request password reset to establish valid baseline
  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: moderatorEmail,
      } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
    },
  );

  // Step 3: Attempt password reset with invalid token
  const newPassword = "NewSecurePassword456!";
  const invalidResetToken = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Verify that password reset fails with invalid token
  await TestValidator.error(
    "password reset should fail with invalid token",
    async () => {
      await api.functional.auth.moderator.password.reset.confirm.resetPassword(
        connection,
        {
          body: {
            token: invalidResetToken,
            password: newPassword,
          } satisfies IDiscussionBoardModerator.IResetPassword,
        },
      );
    },
  );
}
