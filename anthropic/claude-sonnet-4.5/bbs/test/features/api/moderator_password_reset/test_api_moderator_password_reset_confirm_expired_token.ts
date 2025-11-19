import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password reset confirmation with an invalid token scenario.
 *
 * Note: This test validates token validation behavior, but cannot specifically
 * test token expiration without backend support for manipulating token
 * timestamps or accessing the actual token sent via email. The scenario
 * demonstrates that invalid/non-existent tokens are properly rejected by the
 * password reset system.
 *
 * Test workflow:
 *
 * 1. Create a moderator account
 * 2. Request password reset to trigger token generation (sent via email)
 * 3. Attempt password reset with a non-existent/invalid token
 * 4. Validate that the invalid token is rejected with appropriate error
 *
 * Limitation: Testing actual token expiration (1-hour timeout) requires either:
 *
 * - Backend test utilities to create tokens with past expiration timestamps
 * - Database access to manipulate expires_at field
 * - Waiting 1+ hour for natural expiration (impractical for automated tests)
 * - Access to the token sent via email (not available in test environment)
 */
export async function test_api_moderator_password_reset_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for testing
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

  const moderatorData = {
    email: originalEmail,
    password: originalPassword,
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Request password reset to generate token
  // The actual token is sent via email and not returned in the response
  await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: originalEmail,
      } satisfies IDiscussionBoardModerator.IRequestPasswordReset,
    },
  );

  // Step 3: Attempt password reset with an invalid/non-existent token
  // This simulates the scenario where a token is invalid (could be expired, used, or non-existent)
  const invalidToken = typia.random<string & tags.Format<"uuid">>();
  const newPassword = typia.random<string & tags.MinLength<8>>();

  // Step 4: Validate that invalid token is rejected
  await TestValidator.error(
    "invalid or expired token should be rejected",
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
}
