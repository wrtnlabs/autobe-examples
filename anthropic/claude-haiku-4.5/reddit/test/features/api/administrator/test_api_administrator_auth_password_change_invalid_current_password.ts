import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test rejection of password change when an incorrect current password is
 * provided.
 *
 * This test validates the security mechanism that prevents password changes
 * when the current password is incorrect. An administrator attempts to update
 * their password by providing a wrong current password, and the system should
 * reject this request without modifying the account.
 *
 * The test ensures:
 *
 * 1. Administrator account creation succeeds with known credentials
 * 2. Password change attempt with incorrect current password is rejected
 * 3. Account remains intact after the failed password change attempt
 * 4. Password verification security prevents unauthorized modifications
 */
export async function test_api_administrator_auth_password_change_invalid_current_password(
  connection: api.IConnection,
) {
  // 1. Create a new administrator account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "SecurePassword123";
  const adminUsername = RandomGenerator.alphabets(8);

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: correctPassword,
        username: adminUsername,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Verify administrator was created successfully
  TestValidator.predicate(
    "administrator account should be created with active status",
    createdAdmin.account_status === "active",
  );
  TestValidator.equals(
    "administrator email should match input",
    createdAdmin.email,
    adminEmail,
  );

  // 3. Attempt to change password with an incorrect current password
  const wrongCurrentPassword = "WrongPassword456";
  const newPassword = "NewSecurePassword789";
  const originalUpdatedAt = createdAdmin.updated_at;

  await TestValidator.error(
    "password change should fail with incorrect current password",
    async () => {
      await api.functional.communityPlatform.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: wrongCurrentPassword,
            new_password: newPassword,
            new_password_confirm: newPassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // 4. Verify account integrity - confirm the account was not modified
  TestValidator.equals(
    "administrator account status should remain active",
    createdAdmin.account_status,
    "active",
  );
  TestValidator.equals(
    "administrator email should remain unchanged",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "administrator updated_at should not have changed after failed password change",
    createdAdmin.updated_at,
    originalUpdatedAt,
  );
}
