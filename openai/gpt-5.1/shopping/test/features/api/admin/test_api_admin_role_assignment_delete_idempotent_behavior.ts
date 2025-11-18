import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

/**
 * Validate idempotent-like delete behavior for admin role assignments.
 *
 * Business goal:
 *
 * - Ensure that an admin can delete a specific admin role assignment once
 *   successfully, and that a subsequent delete on the same assignment id
 *   signals non-existence via an error, proving that the assignment was truly
 *   removed.
 *
 * Workflow:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated admin
 *    context and its admin id.
 * 2. Create an admin role via POST /shoppingMall/admin/adminRoles.
 * 3. Create an admin role assignment for that role and the joined admin via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments.
 * 4. Call DELETE /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId}
 *    once and assert it succeeds (no error is thrown).
 * 5. Call the same DELETE again with the same id and assert that an error is
 *    thrown, indicating the assignment no longer exists from the client
 *    perspective.
 */
export async function test_api_admin_role_assignment_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Join as an admin (registration + initial authorization)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  const adminId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 2. Create an admin role that can be assigned
  const roleCreateBody = {
    code: `role_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const adminRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(adminRole);

  // 3. Create an admin role assignment for the joined admin under this role
  const assignmentCreateBody = {
    admin_id: adminId,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: adminRole.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment);

  const adminRoleAssignmentId: string & tags.Format<"uuid"> = assignment.id;

  // 4. First DELETE should succeed without throwing, proving the record exists
  await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
    connection,
    {
      adminRoleAssignmentId,
    },
  );

  // 5. Second DELETE should fail because the assignment no longer exists.
  //    We only assert that some error is thrown, not a specific HTTP status.
  await TestValidator.error(
    "second delete on same assignment should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
        connection,
        {
          adminRoleAssignmentId,
        },
      );
    },
  );
}
