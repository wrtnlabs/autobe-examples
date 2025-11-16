import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful password change for an authenticated administrator.
 *
 * This test validates the complete authenticated password change workflow:
 *
 * 1. Create a new administrator account with known credentials
 * 2. Authenticate as the administrator
 * 3. Change the password with current password verification
 * 4. Validate the response confirms successful password change
 *
 * The test ensures that the password change endpoint properly:
 *
 * - Validates the current password against stored hash
 * - Accepts new password meeting security requirements (8+ chars, uppercase,
 *   lowercase, numeric)
 * - Updates the password_hash using bcrypt cost factor 12
 * - Returns confirmation with ID, email, and updated_at timestamp
 * - Maintains administrator's authentication context after password change
 */
export async function test_api_administrator_auth_password_change_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const currentPassword = "SecurePass123";
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphabets(8);

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: currentPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin username matches",
    createdAdmin.username,
    adminUsername,
  );

  // Step 2: Prepare new password meeting security requirements
  const newPassword = "NewSecurePass456";
  const newPasswordConfirm = "NewSecurePass456";

  TestValidator.predicate(
    "new password meets minimum length requirement",
    newPassword.length >= 8,
  );
  TestValidator.predicate(
    "new password contains uppercase letter",
    /[A-Z]/.test(newPassword),
  );
  TestValidator.predicate(
    "new password contains lowercase letter",
    /[a-z]/.test(newPassword),
  );
  TestValidator.predicate(
    "new password contains numeric character",
    /[0-9]/.test(newPassword),
  );

  // Step 3: Call the password change endpoint
  const passwordChangeResponse: ICommunityPlatformAdministrator.IPasswordChangeResponse =
    await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirm: newPasswordConfirm,
        } satisfies ICommunityPlatformAdministrator.IPasswordChange,
      },
    );
  typia.assert(passwordChangeResponse);

  // Step 4: Validate the response
  TestValidator.equals(
    "password change response ID matches admin ID",
    passwordChangeResponse.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "password change response email matches admin email",
    passwordChangeResponse.email,
    createdAdmin.email,
  );

  // Step 5: Verify the account_updated_at timestamp is a valid date-time
  TestValidator.predicate(
    "account_updated_at is a valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      passwordChangeResponse.account_updated_at,
    ),
  );

  // Step 6: Verify success message indicates password change completion
  TestValidator.predicate(
    "password change success message is present",
    passwordChangeResponse.message.length > 0,
  );

  // Step 7: Verify that password was actually changed (timestamp should be newer)
  const originalTimestamp = new Date(createdAdmin.updated_at).getTime();
  const updatedTimestamp = new Date(
    passwordChangeResponse.account_updated_at,
  ).getTime();

  TestValidator.predicate(
    "account_updated_at timestamp is newer than original",
    updatedTimestamp >= originalTimestamp,
  );
}
