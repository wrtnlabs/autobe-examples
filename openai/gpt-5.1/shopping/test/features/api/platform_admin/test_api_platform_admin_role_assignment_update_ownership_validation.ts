import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_update_ownership_validation(
  connection: api.IConnection,
) {
  // 1. Create PlatformAdmin A (owner of the role assignment)
  const joinBodyA = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyA,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminA);

  const adminAId = adminA.id;

  // 2. As PlatformAdmin A, create an admin role
  const roleCreateBody = {
    code: `ROLE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRole>(role);

  // 3. Create a role assignment for PlatformAdmin A
  const assignmentCreateBody = {
    shopping_mall_admin_role_id: role.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentA =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminAId,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignmentA);

  const assignmentId = assignmentA.id;

  // Capture original temporal fields for later comparison
  const originalAssignedAt = assignmentA.assigned_at;
  const originalRevokedAt = assignmentA.revoked_at ?? null;

  TestValidator.equals(
    "role assignment platform admin should equal admin A",
    assignmentA.platform_admin.id,
    adminAId,
  );
  TestValidator.equals(
    "role assignment admin_role should equal created role",
    assignmentA.admin_role.id,
    role.id,
  );

  // 4. Create PlatformAdmin B (attacker attempting cross-admin update)
  const joinBodyB = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBodyB,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminB);

  const adminBId = adminB.id;

  // 5. Attempt unauthorized update from PlatformAdmin B on assignment owned by A
  const unauthorizedUpdateBody = {
    assigned_at: new Date().toISOString(),
    revoked_at: null,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  await TestValidator.error(
    "platform admin B must not be able to update A's role assignment",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
        connection,
        {
          platformAdminId: adminBId,
          roleAssignmentId: assignmentId,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // 6. Optionally, perform a legitimate update as PlatformAdmin A again
  // At this point, connection holds adminB's token due to the last join call.
  // We must re-authenticate as admin A to restore its context.
  const rejoinBodyA = {
    email: joinBodyA.email,
    name: joinBodyA.name,
    password: joinBodyA.password,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminARejoined = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: rejoinBodyA,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminARejoined);

  // Perform a legitimate update as PlatformAdmin A on the same assignment id.
  const legitimateUpdateBody = {
    assigned_at: new Date(Date.now() + 60 * 1000).toISOString(),
    revoked_at: null,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const updatedAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.update(
      connection,
      {
        platformAdminId: adminAId,
        roleAssignmentId: assignmentId,
        body: legitimateUpdateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(updatedAssignment);

  // 7. Validate ownership and role association are preserved
  TestValidator.equals(
    "updated assignment still belongs to platform admin A",
    updatedAssignment.platform_admin.id,
    adminAId,
  );
  TestValidator.equals(
    "updated assignment still references the same admin role",
    updatedAssignment.admin_role.id,
    role.id,
  );

  // 8. Validate that update actually changed temporal fields
  TestValidator.notEquals(
    "assigned_at should be updated after legitimate update",
    updatedAssignment.assigned_at,
    originalAssignedAt,
  );

  TestValidator.equals(
    "revoked_at remains null after legitimate update",
    updatedAssignment.revoked_at ?? null,
    null,
  );
}
