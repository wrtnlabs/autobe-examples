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
 * Basic flow: admin role assignment deletion.
 *
 * This E2E test validates that an authenticated admin can:
 *
 * 1. Join the platform and obtain an authorized admin context.
 * 2. Create a new admin role.
 * 3. Assign that role to themself via the role-assignments API.
 * 4. Delete the created role assignment using its id.
 * 5. Observe that deleting the same assignment again fails, indicating that the
 *    assignment is no longer present.
 *
 * The original scenario mentioned a GET endpoint for a single assignment, but
 * the SDK surface only exposes creation and deletion. Therefore we verify
 * deletion by asserting that a second delete call produces an error rather than
 * by performing a GET.
 */
export async function test_api_admin_role_assignment_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const adminSummary: IShoppingMallAdmin.ISummary | undefined =
    authorized.admin;

  if (adminSummary !== undefined) {
    TestValidator.equals(
      "authorized admin id matches summary",
      authorized.id,
      adminSummary.id,
    );
    TestValidator.equals(
      "authorized admin email matches summary",
      authorized.email,
      adminSummary.email,
    );
  }

  // 2. Create an admin role under this admin context.
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert(role);

  TestValidator.equals(
    "created role code matches request",
    role.code,
    roleCreateBody.code,
  );
  TestValidator.equals(
    "created role name matches request",
    role.name,
    roleCreateBody.name,
  );

  // 3. Create an admin role assignment for the joined admin.
  const adminIdForAssignment: string & tags.Format<"uuid"> =
    (adminSummary?.id ?? authorized.id) as string & tags.Format<"uuid">;

  const assignmentBody = {
    admin_id: adminIdForAssignment,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);

  TestValidator.equals(
    "assignment targets correct admin",
    assignment.shopping_mall_admin_id,
    assignmentBody.admin_id,
  );

  // 4. Delete the created role assignment.
  await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
    connection,
    {
      adminRoleAssignmentId: assignment.id,
    },
  );

  // 5. A second delete on the same id should fail, proving the record is gone.
  await TestValidator.error(
    "second erase on already deleted assignment should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
        connection,
        {
          adminRoleAssignmentId: assignment.id,
        },
      );
    },
  );
}
