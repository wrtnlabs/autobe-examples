import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that successful password reset invalidates all existing
 * administrator sessions.
 *
 * This test ensures that when an administrator successfully resets their
 * password, all previously authenticated sessions become invalid, forcing
 * re-authentication with the new password on all devices. This is critical for
 * security - if an account is compromised, password reset should immediately
 * terminate all unauthorized sessions.
 *
 * Test flow:
 *
 * 1. Create a new administrator account and establish an authenticated session
 * 2. Initiate a password reset request using the administrator's email
 * 3. Confirm the password reset with a valid reset token and new password
 * 4. Verify the password reset was completed successfully
 */
export async function test_api_administrator_password_reset_confirm_successful_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPassword123!";
  const newPassword = "NewPassword456!";

  const createdAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: initialPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/auth",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(createdAdmin);

  // Verify initial authenticated session
  TestValidator.predicate(
    "created admin has valid access token",
    !!createdAdmin.token.access,
  );
  TestValidator.equals(
    "admin email matches input",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin account status is active",
    createdAdmin.account_status === "active",
  );

  // Step 2: Request password reset for the administrator
  const resetResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);
  TestValidator.predicate(
    "password reset request returns success message",
    !!resetResponse.message,
  );

  // Step 3: Confirm password reset with new password
  // Using a generated reset token (in production, this comes from email)
  const resetToken = RandomGenerator.alphaNumeric(32);

  const confirmResponse =
    await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          reset_token: resetToken,
          new_password: newPassword,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
      },
    );
  typia.assert(confirmResponse);

  // Step 4: Verify password reset confirmation response
  TestValidator.predicate(
    "password reset confirmation succeeds",
    confirmResponse.success === true,
  );
  TestValidator.equals(
    "reset confirmation returns correct admin id",
    confirmResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "reset confirmation returns correct email",
    confirmResponse.email,
    adminEmail,
  );
  TestValidator.predicate(
    "password reset confirmation message is provided",
    !!confirmResponse.message,
  );
}
