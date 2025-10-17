import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that password reset tokens cannot be reused after successful
 * consumption.
 *
 * ⚠️ LIMITATION: This test cannot be fully implemented in an E2E environment.
 *
 * The password reset token is delivered via email and is not returned by the
 * API for security reasons. E2E tests do not have access to the email system to
 * extract the token. Therefore, we cannot obtain a valid token to test the
 * reuse prevention mechanism.
 *
 * This functionality should be tested at the unit/integration level where the
 * token can be accessed directly from the database or mocked email service.
 *
 * What we CAN test here:
 *
 * 1. Administrator account creation works
 * 2. Password reset request endpoint accepts valid email
 * 3. Password reset completion endpoint rejects invalid/random tokens
 */
export async function test_api_administrator_password_reset_completion_token_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
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
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Request password reset to generate a token (sent via email)
  const resetRequest =
    await api.functional.auth.administrator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IDiscussionBoardAdministrator.IResetRequest,
      },
    );
  typia.assert(resetRequest);

  // Step 3: Verify that using an invalid/random token fails
  // This at least validates that the endpoint requires a valid token
  const invalidToken = typia.random<string>();
  const newPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  await TestValidator.error(
    "password reset should fail with invalid token",
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

  // Note: We cannot test token reuse prevention in E2E environment because:
  // - The actual reset token is only sent via email
  // - We have no API endpoint to retrieve the token
  // - We cannot access the email system from E2E tests
  // This specific security measure requires unit/integration testing
}
