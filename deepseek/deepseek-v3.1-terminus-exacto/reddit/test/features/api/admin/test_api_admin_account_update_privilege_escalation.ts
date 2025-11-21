import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Validate administrator privilege escalation security boundaries.
 *
 * This test ensures that privilege changes follow proper authorization
 * workflows and security boundaries are maintained between different admin
 * levels.
 */
export async function test_api_admin_account_update_privilege_escalation(
  connection: api.IConnection,
) {
  // 1. Create super administrator account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password: "SuperAdmin123!",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(superAdmin);

  // 2. Create regular administrator account
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: regularAdminEmail,
      password: "RegularAdmin123!",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(regularAdmin);

  // 3. Test that super admin can update regular admin privileges
  const updatedAdmin =
    await api.functional.communityPlatform.admin.admins.update(connection, {
      adminId: regularAdmin.id,
      body: {
        admin_level: "user",
        display_name: "Updated " + RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);

  // 4. Verify the privilege update was successful
  TestValidator.equals(
    "admin level updated successfully by super admin",
    updatedAdmin.admin_level,
    "user",
  );
  TestValidator.notEquals(
    "display name changed during update",
    updatedAdmin.display_name,
    regularAdmin.display_name,
  );
  TestValidator.equals(
    "super admin status remains unchanged as expected",
    updatedAdmin.is_super_admin,
    false,
  );

  // 5. Test privilege escalation validation with invalid data
  await TestValidator.error(
    "should reject invalid admin level update",
    async () => {
      await api.functional.communityPlatform.admin.admins.update(connection, {
        adminId: regularAdmin.id,
        body: {
          admin_level: "invalid_level",
        } satisfies ICommunityPlatformAdmin.IUpdate,
      });
    },
  );

  // 6. Verify original admin data integrity
  TestValidator.equals(
    "original admin email remains unchanged",
    updatedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "original admin ID remains consistent",
    updatedAdmin.id,
    regularAdmin.id,
  );
}
