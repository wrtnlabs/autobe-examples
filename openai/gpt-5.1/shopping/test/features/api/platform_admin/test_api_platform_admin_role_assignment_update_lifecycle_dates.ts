import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate updating lifecycle timestamps on a platform admin role assignment.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain an authenticated platformAdmin context.
 * 2. Under that context, create a new admin role definition using POST
 *    /shoppingMall/platformAdmin/adminRoles.
 * 3. Create an initial admin role assignment linking the platform admin to the
 *    created role using POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments.
 * 4. Prepare an update payload that adjusts the lifecycle timestamps (assigned_at
 *    and revoked_at) using IShoppingMallAdminRoleAssignment.IUpdate.
 * 5. Call PUT
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments/{roleAssignmentId}
 *    to update the assignment.
 * 6. Assert that only lifecycle timestamps change while immutable properties (id,
 *    platform_admin, admin_role) remain stable, and that revoked_at is
 *    correctly set to a non-null value and is on or after assigned_at.
 */
export async function test_api_platform_admin_role_assignment_update_lifecycle_dates(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authenticated context
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new admin role definition
  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: typia.random<IShoppingMallAdminRole.ICreate>(),
      },
    );
  typia.assert(role);

  // 3. Create an initial role assignment for this admin
  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: admin.id,
        body: {
          shopping_mall_admin_role_id: role.id,
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  const originalAssignedAt = assignment.assigned_at;

  // 4. Prepare lifecycle update payload: change assigned_at and set revoked_at
  const newAssignedAt = new Date().toISOString();
  const newRevokedAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour

  const updated: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
      connection,
      {
        platformAdminId: admin.id,
        roleAssignmentId: assignment.id,
        body: {
          assigned_at: newAssignedAt,
          revoked_at: newRevokedAt,
        } satisfies IShoppingMallAdminRoleAssignment.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Business rule assertions
  TestValidator.equals(
    "assignment id should remain stable",
    updated.id,
    assignment.id,
  );

  TestValidator.equals(
    "platform admin ownership must not change",
    updated.platform_admin.id,
    admin.id,
  );

  TestValidator.equals(
    "admin role link must remain the same",
    updated.admin_role.id,
    assignment.admin_role.id,
  );

  TestValidator.notEquals(
    "assigned_at should be updated",
    updated.assigned_at,
    originalAssignedAt,
  );

  TestValidator.equals(
    "assigned_at should match new value",
    updated.assigned_at,
    newAssignedAt,
  );

  TestValidator.equals(
    "revoked_at should be set to new non-null value",
    updated.revoked_at,
    newRevokedAt,
  );

  if (updated.revoked_at !== null && updated.revoked_at !== undefined) {
    const revokedTime = Date.parse(updated.revoked_at);
    const assignedTime = Date.parse(updated.assigned_at);

    TestValidator.predicate(
      "revoked_at should be on or after assigned_at",
      revokedTime >= assignedTime,
    );
  }
}
