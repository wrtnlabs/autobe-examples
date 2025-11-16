import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_update_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin (authenticated context)
  const joined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    });
  typia.assert(joined);

  const platformAdminId: string & tags.Format<"uuid"> = joined.id;

  // 2. Create an admin role definition under this platform admin session
  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: typia.random<IShoppingMallAdminRole.ICreate>(),
      },
    );
  typia.assert(role);

  // 3. Create a role assignment for this platform admin
  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId,
        body: {
          shopping_mall_admin_role_id: role.id,
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  const originalAssignedAt: string & tags.Format<"date-time"> =
    assignment.assigned_at;
  const originalRevokedAt:
    | (string & tags.Format<"date-time">)
    | null
    | undefined = assignment.revoked_at;

  // 4. Prepare an update payload (first attempt)
  const unauthUpdateBody: IShoppingMallAdminRoleAssignment.IUpdate =
    typia.random<IShoppingMallAdminRoleAssignment.IUpdate>();

  // 5. Build an unauthenticated connection (no Authorization header)
  const anonymous: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt unauthorized update and expect error
  await TestValidator.error(
    "unauthenticated platform admin cannot update role assignment",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
        anonymous,
        {
          platformAdminId,
          roleAssignmentId: assignment.id,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 7. Prepare a second update payload for the authenticated update
  const authUpdateBody: IShoppingMallAdminRoleAssignment.IUpdate = {
    assigned_at: new Date().toISOString(),
    revoked_at: null,
  };

  // 8. Perform authenticated update
  const updated: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
      connection,
      {
        platformAdminId,
        roleAssignmentId: assignment.id,
        body: authUpdateBody,
      },
    );
  typia.assert(updated);

  // 9. Validate identity consistency
  TestValidator.equals(
    "updated assignment retains same id",
    updated.id,
    assignment.id,
  );

  TestValidator.equals(
    "updated assignment still belongs to same platform admin",
    updated.platform_admin.id,
    assignment.platform_admin.id,
  );

  TestValidator.equals(
    "updated assignment still targets same admin role",
    updated.admin_role.id,
    assignment.admin_role.id,
  );

  // 10. Validate lifecycle field changes where applicable
  TestValidator.notEquals(
    "assigned_at should be updated when authenticated",
    updated.assigned_at,
    originalAssignedAt,
  );

  if (originalRevokedAt !== undefined && originalRevokedAt !== null) {
    TestValidator.notEquals(
      "revoked_at should be cleared to null on authenticated update when originally non-null",
      updated.revoked_at,
      originalRevokedAt,
    );
  }

  TestValidator.equals(
    "revoked_at should match request payload (null)",
    updated.revoked_at,
    authUpdateBody.revoked_at,
  );
}
