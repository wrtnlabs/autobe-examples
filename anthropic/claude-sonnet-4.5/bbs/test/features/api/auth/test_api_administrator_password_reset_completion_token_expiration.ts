import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test password reset completion with an invalid/expired token.
 *
 * This test validates the system's handling of invalid password reset tokens by
 * attempting to complete a password reset with a token that is not valid. The
 * original scenario (testing actual token expiration after 15 minutes) is not
 * implementable in an automated test because:
 *
 * - We cannot access the actual reset token sent via email
 * - We cannot wait 15+ minutes in a test environment
 * - We cannot manipulate server-side time or token expiration
 *
 * Instead, this test validates that the password reset completion API properly
 * rejects invalid tokens and returns appropriate error responses.
 *
 * Test workflow:
 *
 * 1. Create an administrator account
 * 2. Request a password reset (to establish valid state)
 * 3. Attempt to complete password reset with an invalid token
 * 4. Verify system rejects the request with appropriate error
 */
export async function test_api_administrator_password_reset_completion_token_expiration(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: originalPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  const resetRequestResult =
    await api.functional.auth.administrator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IDiscussionBoardAdministrator.IResetRequest,
      },
    );
  typia.assert(resetRequestResult);

  const invalidToken =
    "invalid-expired-or-nonexistent-token-" + RandomGenerator.alphaNumeric(32);
  const newPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  await TestValidator.error(
    "invalid or expired token should be rejected",
    async () => {
      await api.functional.auth.administrator.password.reset.complete.completePasswordReset(
        connection,
        {
          body: {
            reset_token: invalidToken,
            new_password: newPassword,
            new_password_confirm: newPassword,
          } satisfies IDiscussionBoardAdministrator.IResetComplete,
        },
      );
    },
  );
}
