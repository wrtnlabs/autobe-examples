import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_delete_ownership_validation(
  connection: api.IConnection,
) {
  // 1. Join as PlatformAdmin A and establish initial administrator context.
  const adminAEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAJoinBody = {
    email: adminAEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin-a.example.com/join",
    referrer: "https://admin-a.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Create an admin role definition that will be assigned to platform admins.
  const roleCreateBody = {
    code: `role_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(role);

  // 3. Create a role assignment for PlatformAdmin A.
  const assignmentCreateBody = {
    shopping_mall_admin_role_id: role.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentA: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminA.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignmentA);

  // Validate that the created assignment is associated with admin A and the role.
  TestValidator.equals(
    "role assignment platform_admin.id should match adminA.id",
    assignmentA.platform_admin.id,
    adminA.id,
  );
  TestValidator.equals(
    "role assignment admin_role.id should match created role.id",
    assignmentA.admin_role.id,
    role.id,
  );

  const roleAssignmentIdA: string = assignmentA.id;

  // 4. Join as PlatformAdmin B, switching the authenticated context on the same connection.
  const adminBEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBJoinBody = {
    email: adminBEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin-b.example.com/join",
    referrer: "https://admin-b.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // 5. Cross-admin delete attempt by PlatformAdmin B for assignment owned by PlatformAdmin A.
  //    We expect this to fail, proving that roleAssignments.erase is properly scoped by owner.
  await TestValidator.error(
    "platform admin B cannot delete role assignment belonging to platform admin A",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
        connection,
        {
          platformAdminId: adminB.id,
          roleAssignmentId: roleAssignmentIdA,
        },
      );
    },
  );
}
