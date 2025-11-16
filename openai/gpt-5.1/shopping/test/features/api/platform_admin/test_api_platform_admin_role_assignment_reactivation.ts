import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_reactivation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    });
  typia.assert(authorizedAdmin);

  const platformAdminId = authorizedAdmin.id;

  // 2. Create an admin role definition.
  const roleCreateBody = typia.random<IShoppingMallAdminRole.ICreate>();

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(createdRole);

  // 3. Create an admin role assignment for this admin and role.
  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId,
        body: {
          shopping_mall_admin_role_id: createdRole.id,
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(createdAssignment);

  // Basic identity assertions on creation.
  TestValidator.equals(
    "platform admin id is consistent on initial assignment",
    createdAssignment.platform_admin.id,
    platformAdminId,
  );
  TestValidator.equals(
    "admin role id is consistent on initial assignment",
    createdAssignment.admin_role.id,
    createdRole.id,
  );

  const originalAssignmentId = createdAssignment.id;
  const originalAssignedAt = createdAssignment.assigned_at;

  // 4. Revoke the assignment by setting revoked_at to a non-null timestamp.
  const revokedAtTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const revokedAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
      connection,
      {
        platformAdminId,
        roleAssignmentId: originalAssignmentId,
        body: {
          revoked_at: revokedAtTimestamp,
        } satisfies IShoppingMallAdminRoleAssignment.IUpdate,
      },
    );
  typia.assert(revokedAssignment);

  // Validate identity stability and lifecycle after revocation.
  TestValidator.equals(
    "role assignment id is stable after revocation",
    revokedAssignment.id,
    originalAssignmentId,
  );
  TestValidator.equals(
    "platform admin id is consistent after revocation",
    revokedAssignment.platform_admin.id,
    platformAdminId,
  );
  TestValidator.equals(
    "admin role id is consistent after revocation",
    revokedAssignment.admin_role.id,
    createdRole.id,
  );
  TestValidator.equals(
    "assigned_at remains unchanged after revocation",
    revokedAssignment.assigned_at,
    originalAssignedAt,
  );
  TestValidator.predicate(
    "revoked_at is set after revocation",
    revokedAssignment.revoked_at !== null &&
      revokedAssignment.revoked_at !== undefined,
  );

  // 5. Reactivate the assignment by explicitly clearing revoked_at to null.
  const reactivatedAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
      connection,
      {
        platformAdminId,
        roleAssignmentId: originalAssignmentId,
        body: {
          revoked_at: null,
        } satisfies IShoppingMallAdminRoleAssignment.IUpdate,
      },
    );
  typia.assert(reactivatedAssignment);

  // 6. Validate reactivation semantics.
  TestValidator.equals(
    "role assignment id is stable after reactivation",
    reactivatedAssignment.id,
    originalAssignmentId,
  );
  TestValidator.equals(
    "platform admin id is consistent after reactivation",
    reactivatedAssignment.platform_admin.id,
    platformAdminId,
  );
  TestValidator.equals(
    "admin role id is consistent after reactivation",
    reactivatedAssignment.admin_role.id,
    createdRole.id,
  );
  TestValidator.equals(
    "assigned_at remains unchanged after reactivation",
    reactivatedAssignment.assigned_at,
    originalAssignedAt,
  );
  TestValidator.equals(
    "revoked_at is cleared on reactivation",
    reactivatedAssignment.revoked_at,
    null,
  );
}
