import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_retrieval_wrong_admin_scope(
  connection: api.IConnection,
) {
  // 1. Register Admin A (first platform admin)
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin-a.example.com/join",
    referrer: "https://admin-a.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. As Admin A, create an admin role definition
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(role);

  // 3. Still as Admin A, create a role assignment for Admin A
  const assignmentCreateBody = {
    shopping_mall_admin_role_id: role.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentForAdminA: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminA.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignmentForAdminA);

  // Sanity check: assignment belongs to Admin A
  TestValidator.equals(
    "assignment is linked to Admin A",
    assignmentForAdminA.platform_admin.id,
    adminA.id,
  );

  // 4. Register Admin B (second platform admin), switching auth context
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin-b.example.com/join",
    referrer: "https://admin-b.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // Ensure Admin B is a different admin from Admin A
  TestValidator.notEquals(
    "Admin B must have different id from Admin A",
    adminA.id,
    adminB.id,
  );

  // 5. As Admin B, attempt to retrieve Admin A's role assignment using
  //    Admin B's platformAdminId but Admin A's roleAssignmentId.
  await TestValidator.error(
    "cross-admin role assignment retrieval must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.at(
        connection,
        {
          platformAdminId: adminB.id,
          roleAssignmentId: assignmentForAdminA.id,
        },
      );
    },
  );
}
