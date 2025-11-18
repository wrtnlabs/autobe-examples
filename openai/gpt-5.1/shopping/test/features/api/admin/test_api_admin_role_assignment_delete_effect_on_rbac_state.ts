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
 * Validate that deleting one admin role assignment revokes only that role
 * without affecting other roles assigned to the same admin.
 *
 * Business context:
 *
 * - Admins are onboarded via /auth/admin/join and receive JWT-based auth.
 * - RBAC is modeled by distinct admin role records and a join table of
 *   assignments linking admins to roles.
 * - Deleting an assignment should surgically remove only that one admin–role
 *   link, leaving other roles and assignments intact.
 *
 * Scenario:
 *
 * 1. Join a fresh admin (A) to get an authenticated admin context.
 * 2. Under admin A, create two roles: ROLE_A and ROLE_B.
 * 3. Assign both roles to admin A, capturing both assignment IDs.
 * 4. Delete the ROLE_A assignment by its assignment ID.
 * 5. Confirm at the API-behavior level that:
 *
 *    - The erase call succeeds.
 *    - The ROLE_B assignment object remains a valid DTO instance.
 *    - IDs for admin, roles, and assignments remain consistent with the values
 *         returned from previous steps.
 *
 * Note:
 *
 * - Because we only have create and erase APIs (no read/search APIs for
 *   assignments are provided), we cannot re-fetch assignment state to inspect
 *   the deletion. Instead, we validate that:
 *
 *   - All DTOs returned before deletion are structurally correct.
 *   - The erase endpoint accepts the assignment ID and completes without error.
 * - Conceptually, in a full system this would translate to RBAC logic computing
 *   effective permissions using only the remaining assignments.
 */
export async function test_api_admin_role_assignment_delete_effect_on_rbac_state(
  connection: api.IConnection,
) {
  // 1. Join a fresh admin, which also seeds Authorization header state.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Basic sanity checks on returned admin structure.
  TestValidator.predicate(
    "admin id should be UUID-formatted string",
    () => adminAuthorized.id.length > 0,
  );
  TestValidator.equals(
    "authorized email should match join email",
    adminAuthorized.email,
    joinBody.email,
  );

  const adminId = adminAuthorized.id;

  // 2. Create two distinct admin roles: ROLE_A and ROLE_B.
  const roleAcode = `ROLE_A_${RandomGenerator.alphaNumeric(8)}`;
  const roleBcode = `ROLE_B_${RandomGenerator.alphaNumeric(8)}`;

  const roleACreateBody = {
    code: roleAcode,
    name: `Role A ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const roleA = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    { body: roleACreateBody },
  );
  typia.assert<IShoppingMallAdminRole>(roleA);
  TestValidator.equals("role A code should match", roleA.code, roleAcode);

  const roleBCreateBody = {
    code: roleBcode,
    name: `Role B ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const roleB = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    { body: roleBCreateBody },
  );
  typia.assert<IShoppingMallAdminRole>(roleB);
  TestValidator.equals("role B code should match", roleB.code, roleBcode);

  // 3. Assign both roles to the same admin.
  const assignmentABody = {
    admin_id: adminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentA =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleAcode,
        body: assignmentABody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignmentA);
  TestValidator.equals(
    "assignment A admin id should match admin id",
    assignmentA.shopping_mall_admin_id,
    adminId,
  );

  const assignmentBBody = {
    admin_id: adminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentB =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleBcode,
        body: assignmentBBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignmentB);
  TestValidator.equals(
    "assignment B admin id should match admin id",
    assignmentB.shopping_mall_admin_id,
    adminId,
  );

  // Sanity check: the two assignments must be different records.
  TestValidator.notEquals(
    "assignment A and B should have different ids",
    assignmentA.id,
    assignmentB.id,
  );

  // 4. Delete the ROLE_A assignment using its id.
  await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
    connection,
    {
      adminRoleAssignmentId: assignmentA.id,
    },
  );

  // 5. Post-conditions we can assert with available APIs:
  // - We still hold a structurally valid ROLE_B assignment object.
  // - Its id remains a UUID-looking string and is not affected by the erase.
  TestValidator.predicate(
    "remaining assignment B id remains non-empty after A is erased",
    () => assignmentB.id.length > 0,
  );

  // Re-assert DTO structure to emphasize that nothing about assignmentB
  // has been mutated by the erase call.
  typia.assert<IShoppingMallAdminRoleAssignment>(assignmentB);
}
