import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignment_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Create the granting admin (will also authenticate the connection as this admin)
  const grantingAdmin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(grantingAdmin);

  // 2. Create an admin role to be assigned later
  const roleCode = `role_${RandomGenerator.alphaNumeric(12)}`;
  const createRoleBody = {
    code: roleCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    {
      body: createRoleBody,
    },
  );
  typia.assert<IShoppingMallAdminRole>(role);

  TestValidator.equals(
    "created role code should match request payload",
    role.code,
    roleCode,
  );

  // 3. Create the assignee admin (the admin who receives the role assignment)
  const assigneeAdmin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(assigneeAdmin);

  // 4. Create an admin role assignment for the assignee under the created role
  const initialReason = "initial assignment reason";
  const assignmentCreateBody = {
    admin_id: assigneeAdmin.id,
    reason: initialReason,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleCode,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment);

  TestValidator.equals(
    "assignment admin id should match assignee admin id",
    assignment.shopping_mall_admin_id,
    assigneeAdmin.id,
  );
  TestValidator.equals(
    "assignment reason should match initial reason",
    assignment.reason ?? null,
    initialReason,
  );

  // 5. Update the admin role assignment's mutable metadata
  const updatedReason = "updated assignment reason";
  const updateBody = {
    reason: updatedReason,
    granted_by_admin_id: grantingAdmin.id,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const updated =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: assignment.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(updated);

  // 6. Validate that immutable fields are preserved and mutable fields updated
  TestValidator.equals(
    "assignment id should remain unchanged after update",
    updated.id,
    assignment.id,
  );
  TestValidator.equals(
    "shopping_mall_admin_id should remain unchanged after update",
    updated.shopping_mall_admin_id,
    assignment.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "shopping_mall_admin_role_id should remain unchanged after update",
    updated.shopping_mall_admin_role_id,
    assignment.shopping_mall_admin_role_id,
  );

  TestValidator.equals(
    "assignment reason should be updated to new value",
    updated.reason,
    updatedReason,
  );
  TestValidator.equals(
    "granted_by_admin_id should be set to granting admin id",
    updated.granted_by_admin_id,
    grantingAdmin.id,
  );
}
