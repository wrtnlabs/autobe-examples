import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test rejection of password change when the new password fails security
 * complexity requirements.
 *
 * This test validates that the password change endpoint properly enforces
 * password security requirements. An administrator is created with valid
 * credentials, and then attempts to change their password to weak passwords
 * that fail complexity validation (too short, missing uppercase, missing
 * lowercase, or missing numeric characters). Each attempt should be rejected
 * with an error.
 *
 * Steps:
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Attempt to change password with a password that's too short (< 8 characters)
 * 3. Verify the request is rejected with error
 * 4. Attempt to change password with lowercase-only password
 * 5. Verify the request is rejected with error
 * 6. Attempt to change password with uppercase-only password
 * 7. Verify the request is rejected with error
 * 8. Attempt to change password with no numeric characters
 * 9. Verify the request is rejected with error
 */
export async function test_api_administrator_auth_password_change_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPassword123";

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin",
        referrer: null,
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2-3: Attempt to change password with a password that's too short
  await TestValidator.error(
    "password change should fail with too short password",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: adminPassword,
            new_password: "Short1",
            new_password_confirm: "Short1",
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // Step 4-5: Attempt to change password with lowercase-only password
  await TestValidator.error(
    "password change should fail with lowercase-only password",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: adminPassword,
            new_password: "lowercaseonly12345",
            new_password_confirm: "lowercaseonly12345",
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // Step 6-7: Attempt to change password with uppercase-only password
  await TestValidator.error(
    "password change should fail with uppercase-only password",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: adminPassword,
            new_password: "UPPERCASEONLY12345",
            new_password_confirm: "UPPERCASEONLY12345",
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // Step 8-9: Attempt to change password with no numeric characters
  await TestValidator.error(
    "password change should fail with no numeric characters",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: adminPassword,
            new_password: "PasswordWithoutNumbers",
            new_password_confirm: "PasswordWithoutNumbers",
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );
}
