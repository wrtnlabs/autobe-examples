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
 * Validate that duplicate admin role assignments for the same admin and role
 * are prevented.
 *
 * Business context:
 *
 * - Admins can be assigned roles via RBAC assignments stored in
 *   shopping_mall_admin_role_assignments.
 * - The combination (shopping_mall_admin_id, shopping_mall_admin_role_id) is
 *   expected to be unique by business rule / DB unique index.
 * - Creating a second assignment for the same admin and same role should be
 *   rejected.
 *
 * Scenario steps:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain
 *    IShoppingMallAdmin.IAuthorized and establish Authorization header on the
 *    connection.
 * 2. Create a new admin role via POST /shoppingMall/admin/adminRoles with a unique
 *    code so that assignments can reference it.
 * 3. Create the first role assignment via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments using the
 *    created role.code and the admin's id as admin_id; expect success and
 *    validate the returned IShoppingMallAdminRoleAssignment via typia.assert.
 * 4. Immediately attempt to create a second assignment for the exact same (admin,
 *    role) pair but with a different reason string.
 * 5. Assert that the second attempt fails using await TestValidator.error,
 *    ensuring business rules prevent duplicate assignments.
 */
export async function test_api_admin_role_assignment_create_prevents_duplicate_for_same_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin to get authorized context and token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new admin role with unique code
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(role);

  // 3. Create first role assignment for this admin and role
  const firstAssignmentBody = {
    admin_id: authorized.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const firstAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: firstAssignmentBody,
      },
    );
  typia.assert(firstAssignment);

  // Basic sanity checks on first assignment
  TestValidator.equals(
    "first assignment admin id matches authorized admin",
    firstAssignment.shopping_mall_admin_id,
    authorized.id,
  );

  // 4 & 5. Attempt duplicate assignment and expect failure
  const secondAssignmentBody = {
    admin_id: authorized.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  await TestValidator.error(
    "duplicate admin-role assignment should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.adminRoles.assignments.create(
        connection,
        {
          adminRoleCode: role.code,
          body: secondAssignmentBody,
        },
      );
    },
  );
}
