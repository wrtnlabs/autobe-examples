import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password change rejection when new_password and new_password_confirm do
 * not match.
 *
 * This test validates that the password change API properly rejects requests
 * where the new password and confirmation password do not match exactly. This
 * is a critical validation to prevent accidental password typos during entry.
 *
 * Test workflow:
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Prepare a password change request with mismatched confirmation password
 * 3. Attempt the password change and verify it fails due to mismatch
 */
export async function test_api_administrator_password_change_new_password_mismatch(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const currentPassword = "ValidPassword123";

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: currentPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator account created successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Prepare password change with mismatched confirmation
  const newPassword = "NewPassword456";
  const mismatchedConfirmation = "DifferentPassword789"; // Intentionally different

  // Step 3: Attempt password change with mismatched passwords - should fail
  await TestValidator.error(
    "password change should fail when new_password and new_password_confirm do not match",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: newPassword,
            new_password_confirm: mismatchedConfirmation,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );
}
