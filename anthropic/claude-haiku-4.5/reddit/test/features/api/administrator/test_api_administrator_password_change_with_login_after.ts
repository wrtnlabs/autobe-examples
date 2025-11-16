import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that a successfully changed password allows the administrator to login
 * with the new password.
 *
 * This test validates the complete password change and re-authentication
 * workflow:
 *
 * 1. Create a new administrator account with initial credentials
 * 2. Change the administrator's password using the password change endpoint
 * 3. Verify the administrator can authenticate with the new password
 * 4. Confirm the password hash was properly updated and persisted
 *
 * This ensures password changes are securely processed and allow subsequent
 * authentication.
 */
export async function test_api_administrator_password_change_with_login_after(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(12);
  const adminName = RandomGenerator.name();
  const initialPassword = "InitialPass123!";

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: initialPassword,
        username: adminUsername,
        name: adminName,
        href: "https://admin.example.com/login",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Verify the administrator was created successfully
  TestValidator.equals("admin email matches", createdAdmin.email, adminEmail);
  TestValidator.equals(
    "admin username matches",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.predicate(
    "admin account is active",
    createdAdmin.account_status === "active",
  );

  // Step 2: Change the administrator's password
  const newPassword = "NewSecurePass456!";

  const passwordChangeResponse: ICommunityPlatformAdministrator.IPasswordChangeResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
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

  // Verify the password change response
  TestValidator.equals(
    "password change response contains correct admin ID",
    passwordChangeResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "password change response contains correct email",
    passwordChangeResponse.email,
    adminEmail,
  );
  TestValidator.predicate(
    "password change message indicates success",
    passwordChangeResponse.message.toLowerCase().includes("success"),
  );

  // Step 3: Verify the administrator can login with the new password
  const loggedInAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: newPassword,
        href: "https://admin.example.com/login",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Verify successful re-authentication with new password
  TestValidator.equals(
    "logged in admin ID matches created admin ID",
    loggedInAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "logged in admin email matches",
    loggedInAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "access token is provided",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    loggedInAdmin.token.refresh.length > 0,
  );

  // Step 4: Verify that login with the old password fails
  await TestValidator.error("login with old password should fail", async () => {
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: initialPassword,
        href: "https://admin.example.com/login",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  });
}
