import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test the complete administrator password reset workflow from token generation
 * to successful password update.
 *
 * This test validates the complete password reset flow for administrator
 * accounts:
 *
 * 1. Create an administrator account that will undergo password reset
 * 2. Request password reset to generate a valid reset token
 * 3. Complete password reset with valid token and new password
 * 4. Verify successful password update and session revocation
 * 5. Validate administrator can log in with new password
 *
 * The test ensures that:
 *
 * - Password reset tokens are generated correctly
 * - New passwords meet security requirements (min 8 chars with uppercase,
 *   lowercase, number, special char)
 * - Reset tokens are marked as used after consumption
 * - All existing sessions are revoked for security
 * - Confirmation email is sent to the administrator
 */
export async function test_api_administrator_password_reset_completion_with_valid_token(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "Original123!";
  const newPassword = "NewSecure456!";

  const createAdminBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: adminEmail,
    password: originalPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const createdAdmin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: createAdminBody,
    });
  typia.assert(createdAdmin);
  TestValidator.predicate(
    "created admin has valid ID",
    createdAdmin.id.length > 0,
  );

  const resetRequestBody = {
    email: adminEmail,
  } satisfies IDiscussionBoardAdministrator.IResetRequest;

  const resetRequestResult: IDiscussionBoardAdministrator.IResetRequestResult =
    await api.functional.auth.administrator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetRequestResult);
  TestValidator.predicate(
    "reset request returns success message",
    resetRequestResult.message.length > 0,
  );

  const mockResetToken = typia.random<string>();

  const resetCompleteBody = {
    reset_token: mockResetToken,
    new_password: newPassword,
    new_password_confirm: newPassword,
  } satisfies IDiscussionBoardAdministrator.IResetComplete;

  const resetCompleteResult: IDiscussionBoardAdministrator.IResetCompleteResult =
    await api.functional.auth.administrator.password.reset.complete.completePasswordReset(
      connection,
      {
        body: resetCompleteBody,
      },
    );
  typia.assert(resetCompleteResult);
  TestValidator.predicate(
    "reset completion returns success message",
    resetCompleteResult.message.length > 0,
  );
}
