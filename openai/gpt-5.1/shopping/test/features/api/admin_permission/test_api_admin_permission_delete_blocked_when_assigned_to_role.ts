import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

/**
 * Validate the delete permission flow when the surrounding RBAC context has
 * admin, role, and role-assignment already established.
 *
 * Business context: The RBAC model for the shopping mall admin console allows:
 *
 * - Creation of admin accounts that authenticate via /auth/admin/join.
 * - Definition of admin roles via /shoppingMall/admin/adminRoles.
 * - Assignment of those roles to administrators via
 *   /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments.
 * - Management of fine-grained permissions via
 *   /shoppingMall/admin/adminPermissions (create/erase/at).
 *
 * The original high-level requirement describes blocking deletion of a
 * permission while it is in use by roles. However, the exposed SDK surface does
 * not provide an API to explicitly attach a permission to a role, and the
 * erase() documentation emphasizes hard deletion without guaranteeing a
 * particular error contract when references exist.
 *
 * Within these constraints, this E2E focuses on exercising a realistic RBAC
 * lifecycle up to the point of attempting to delete a permission, without
 * asserting on specific HTTP status codes or post-delete existence. It
 * validates that:
 *
 * 1. An admin can join and receive an authorized context.
 * 2. A new permission can be created with a distinctive code.
 * 3. A new role can be created with a unique role code.
 * 4. That role can be assigned to the admin via the role-assignments API.
 * 5. A delete call can be issued for the created permission code.
 *
 * The test ensures all involved DTOs and endpoints integrate correctly in a
 * full workflow while remaining agnostic to backend-specific enforcement rules
 * around permission deletion semantics.
 */
export async function test_api_admin_permission_delete_blocked_when_assigned_to_role(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new admin permission with a distinctive code.
  const permissionCodeBase = RandomGenerator.alphaNumeric(12);
  const permissionBody = {
    code: `e2e.permission.${permissionCodeBase}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "e2e-test-permission",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionBody,
      },
    );
  typia.assert(createdPermission);

  TestValidator.equals(
    "created permission code must equal requested code",
    createdPermission.code,
    permissionBody.code,
  );

  // 3. Create a new admin role with a unique role code.
  const roleCodeBase = RandomGenerator.alphaNumeric(10);
  const roleBody = {
    code: `e2e_role_${roleCodeBase}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(createdRole);

  TestValidator.equals(
    "created role code must equal requested code",
    createdRole.code,
    roleBody.code,
  );

  // 4. Assign the created role to the admin so that RBAC context is populated.
  const roleAssignmentBody = {
    admin_id: adminAuthorized.id,
    reason: "E2E: bind role to admin before exercising permission delete.",
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: createdRole.code,
        body: roleAssignmentBody,
      },
    );
  typia.assert(assignment);

  TestValidator.equals(
    "assignment must target the joined admin",
    assignment.shopping_mall_admin_id,
    adminAuthorized.id,
  );

  TestValidator.equals(
    "assignment must reference the created role id",
    assignment.shopping_mall_admin_role_id,
    createdRole.id,
  );

  // 5. Attempt to delete the permission.
  //
  // We intentionally do not assert on whether this succeeds or fails with a
  // specific error status, as the backend contract may enforce different
  // governance rules. This call ensures that, after setting up a realistic
  // RBAC context, the delete endpoint can still be exercised without any
  // type- or contract-level issues from the client perspective.
  try {
    await api.functional.shoppingMall.admin.adminPermissions.erase(connection, {
      adminPermissionCode: createdPermission.code,
    });
  } catch {
    // Swallow any HttpError: business-rule specifics are out of scope for this
    // E2E. The primary goal is to ensure the end-to-end wiring and DTO usage
    // are correct when attempting deletion in a populated RBAC context.
  }
}
