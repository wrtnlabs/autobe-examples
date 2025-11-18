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
 * Validate successful creation of an admin role assignment under a specific
 * role.
 *
 * Business workflow:
 *
 * 1. Register an administrator using POST /auth/admin/join to obtain an
 *    authenticated admin context and its id.
 * 2. As that admin, create a new RBAC role via POST /shoppingMall/admin/adminRoles
 *    using IShoppingMallAdminRole.ICreate and capture its business code.
 * 3. Still under the same authenticated admin session, create a role assignment
 *    via POST /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments,
 *    targeting the same admin and providing a human-readable reason.
 * 4. Assert that the assignment response conforms to
 *    IShoppingMallAdminRoleAssignment and that key fields (admin id, reason,
 *    timestamps, soft-delete flag) reflect the expected values.
 *
 * This test focuses on the happy path of role assignment creation, not on error
 * handling or edge cases such as duplicate assignments or invalid role codes.
 */
export async function test_api_admin_role_assignment_create_success(
  connection: api.IConnection,
) {
  // 1. Register an administrator and obtain authorized context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  const targetAdminId = authorizedAdmin.id;

  // 2. Create a new admin role
  const roleCreateBody = typia.random<IShoppingMallAdminRole.ICreate>();

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  const roleCode = createdRole.code;

  // 3. Create an admin role assignment for the created role and admin
  const assignmentReason = "Grant role for initial RBAC setup";

  const assignmentBody = {
    admin_id: targetAdminId,
    reason: assignmentReason,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleCode,
        body: assignmentBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment);

  // 4. Business assertions
  TestValidator.equals(
    "assignment admin id should match target admin id",
    assignment.shopping_mall_admin_id,
    targetAdminId,
  );

  TestValidator.equals(
    "assignment reason should match input reason",
    assignment.reason,
    assignmentReason,
  );

  TestValidator.predicate(
    "assignment deleted_at should be null or undefined for active assignment",
    assignment.deleted_at === null || assignment.deleted_at === undefined,
  );
}
