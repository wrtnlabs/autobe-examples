import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates administrator password change and subsequent authentication.
 *
 * This test verifies the complete password change workflow:
 *
 * 1. Create a new administrator account with initial credentials
 * 2. Change the administrator password using the password change endpoint
 * 3. Verify the administrator can authenticate with the new password
 * 4. Ensure the old password no longer works for authentication
 *
 * This validates that the password hash was properly updated and persisted in
 * the database, and that the authentication system correctly validates against
 * the new password hash.
 */
export async function test_api_administrator_auth_password_change_with_login_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with initial credentials
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPassword123!";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: initialEmail,
        password: initialPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    initialEmail,
  );
  TestValidator.equals(
    "created admin username matches input",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.predicate(
    "created admin has valid token",
    createdAdmin.token.access.length > 0,
  );

  // Step 2: Change the administrator password
  const newPassword = "NewPassword456!";
  const passwordChangeResponse: ICommunityPlatformAdministrator.IPasswordChangeResponse =
    await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
          new_password_confirm: newPassword,
        } satisfies ICommunityPlatformAdministrator.IPasswordChange,
      },
    );
  typia.assert(passwordChangeResponse);

  TestValidator.equals(
    "password change response email matches",
    passwordChangeResponse.email,
    initialEmail,
  );
  TestValidator.equals(
    "password change response id matches created admin id",
    passwordChangeResponse.id,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "password change message indicates success",
    passwordChangeResponse.message.length > 0,
  );

  // Step 3: Verify administrator can login with new password
  const loginWithNewPassword: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: initialEmail,
        password: newPassword,
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(loginWithNewPassword);

  TestValidator.equals(
    "login with new password returns correct admin id",
    loginWithNewPassword.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "login with new password returns correct email",
    loginWithNewPassword.email,
    initialEmail,
  );
  TestValidator.predicate(
    "login with new password generates new access token",
    loginWithNewPassword.token.access.length > 0,
  );

  // Step 4: Verify old password no longer works for authentication
  await TestValidator.error("login with old password should fail", async () => {
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: initialEmail,
        password: initialPassword,
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  });
}
