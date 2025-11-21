import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test that a super administrator can successfully update another administrator
 * account with comprehensive profile information. This scenario validates that
 * all updatable fields including email, display name, admin level, and super
 * admin status can be modified by authorized personnel.
 */
export async function test_api_admin_account_update_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create super administrator account for authentication context
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password: "superAdmin123!" satisfies string &
        tags.Format<"password"> as string,
      display_name: "Super Administrator",
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(superAdmin);

  // Step 2: Create target administrator account to be updated
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: targetAdminEmail,
      password: "targetAdmin123!" satisfies string &
        tags.Format<"password"> as string,
      display_name: "Target Administrator",
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(targetAdmin);

  // Re-authenticate as super admin before performing update
  await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password: "superAdmin123!" satisfies string &
        tags.Format<"password"> as string,
      display_name: "Super Administrator",
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // Step 3: Perform the update operation with comprehensive field modifications
  const newEmail = "updated.admin@example.com" satisfies string &
    tags.Format<"email"> as string;
  const updatedAdmin =
    await api.functional.communityPlatform.admin.admins.update(connection, {
      adminId: targetAdmin.id,
      body: {
        email: newEmail,
        display_name: "Updated Administrator",
        admin_level: "user",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);

  // Step 4: Validate that all updatable fields are correctly modified
  TestValidator.equals("email should be updated", updatedAdmin.email, newEmail);
  TestValidator.equals(
    "display name should be updated",
    updatedAdmin.display_name,
    "Updated Administrator",
  );
  TestValidator.equals(
    "admin level should be updated",
    updatedAdmin.admin_level,
    "user",
  );
  TestValidator.equals(
    "super admin status should be updated",
    updatedAdmin.is_super_admin,
    true,
  );
  TestValidator.equals(
    "ID should remain unchanged",
    updatedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "password hash should remain unchanged",
    updatedAdmin.password_hash,
    targetAdmin.password_hash,
  );
  TestValidator.equals(
    "created at should remain unchanged",
    updatedAdmin.created_at,
    targetAdmin.created_at,
  );
  TestValidator.notEquals(
    "updated at should be different",
    updatedAdmin.updated_at,
    targetAdmin.updated_at,
  );

  // Step 5: Test error scenarios
  // Test updating non-existent admin
  await TestValidator.error(
    "should fail when updating non-existent admin",
    async () => {
      await api.functional.communityPlatform.admin.admins.update(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          display_name: "Non-existent Admin",
        } satisfies ICommunityPlatformAdmin.IUpdate,
      });
    },
  );

  // Test partial update with only specific fields
  const partiallyUpdatedAdmin =
    await api.functional.communityPlatform.admin.admins.update(connection, {
      adminId: targetAdmin.id,
      body: {
        display_name: "Partially Updated",
      } satisfies ICommunityPlatformAdmin.IUpdate,
    });
  typia.assert(partiallyUpdatedAdmin);

  TestValidator.equals(
    "display name should be updated in partial update",
    partiallyUpdatedAdmin.display_name,
    "Partially Updated",
  );
  TestValidator.equals(
    "email should remain unchanged in partial update",
    partiallyUpdatedAdmin.email,
    newEmail,
  );
  TestValidator.equals(
    "admin level should remain unchanged in partial update",
    partiallyUpdatedAdmin.admin_level,
    "user",
  );
  TestValidator.equals(
    "super admin status should remain unchanged in partial update",
    partiallyUpdatedAdmin.is_super_admin,
    true,
  );
}
