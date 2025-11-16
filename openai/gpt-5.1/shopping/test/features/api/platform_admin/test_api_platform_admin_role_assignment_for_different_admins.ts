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
 * Verify that the same admin role can be assigned to two different platform
 * administrators without conflict.
 *
 * Business workflow covered by this test:
 *
 * 1. Register platform admin A via POST /auth/platformAdmin/join.
 * 2. Register platform admin B via POST /auth/platformAdmin/join.
 * 3. While authenticated as a platform admin, create a shared admin role via POST
 *    /shoppingMall/platformAdmin/adminRoles.
 * 4. Assign that role to Admin A using POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments.
 * 5. Assign the same role to Admin B using the same endpoint but a different
 *    platformAdminId.
 * 6. Validate that:
 *
 *    - Both role assignments are created successfully and conform to
 *         IShoppingMallAdminRoleAssignment.
 *    - The assignment IDs are different, proving two distinct records.
 *    - Each assignment.platform_admin.id matches its respective admin (A or B).
 *    - Each assignment.admin_role.id equals the created role's id, confirming that
 *         the same role is reused across admins.
 */
export async function test_api_platform_admin_role_assignment_for_different_admins(
  connection: api.IConnection,
) {
  // 1. Register platform admin A
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBodyA,
    });
  typia.assert(adminA);

  // 2. Register platform admin B
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBodyB,
    });
  typia.assert(adminB);

  // 3. Create a shared admin role using the current authenticated platform admin
  const roleBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleBody,
      },
    );
  typia.assert(role);

  // 4. Assign the role to Admin A
  const assignmentBodyA = {
    shopping_mall_admin_role_id: role.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentA: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminA.id,
        body: assignmentBodyA,
      },
    );
  typia.assert(assignmentA);

  // 5. Assign the same role to Admin B
  const assignmentBodyB = {
    shopping_mall_admin_role_id: role.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentB: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminB.id,
        body: assignmentBodyB,
      },
    );
  typia.assert(assignmentB);

  // 6. Business validations
  // 6-1. Two distinct assignment records
  TestValidator.notEquals(
    "role assignments for two different admins must have different ids",
    assignmentA.id,
    assignmentB.id,
  );

  // 6-2. Each assignment's platform_admin summary references the correct admin
  TestValidator.equals(
    "assignment A must reference admin A as platform_admin",
    assignmentA.platform_admin.id,
    adminA.id,
  );
  TestValidator.equals(
    "assignment B must reference admin B as platform_admin",
    assignmentB.platform_admin.id,
    adminB.id,
  );

  // 6-3. Both assignments share the same admin_role id (the created role)
  TestValidator.equals(
    "assignment A must reference the created role",
    assignmentA.admin_role.id,
    role.id,
  );
  TestValidator.equals(
    "assignment B must reference the created role",
    assignmentB.admin_role.id,
    role.id,
  );

  // 6-4. Optional: verify admin_role summary consistency across assignments
  TestValidator.equals(
    "both assignments must share the same admin_role summary",
    assignmentA.admin_role.code,
    assignmentB.admin_role.code,
  );
  TestValidator.equals(
    "admin role name must be consistent across assignments",
    assignmentA.admin_role.name,
    assignmentB.admin_role.name,
  );
}
