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
 * Validate partial updates on admin role assignments.
 *
 * Business goal: Ensure that PUT
 * /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId} supports
 * true partial updates on the mutable metadata fields of an admin role
 * assignment. When only `reason` is provided in
 * IShoppingMallAdminRoleAssignment.IUpdate, `granted_by_admin_id` must not be
 * altered, and vice versa.
 *
 * Scenario:
 *
 * 1. Register an initial admin A via POST /auth/admin/join to obtain an
 *    authenticated admin context for managing roles and assignments.
 * 2. Under admin A, create an admin role via POST /shoppingMall/admin/adminRoles
 *    with IShoppingMallAdminRole.ICreate.
 * 3. Register a second admin B via POST /auth/admin/join, whose id will be the
 *    target of the role assignment.
 * 4. As admin A, create a role assignment for admin B via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments using
 *    IShoppingMallAdminRoleAssignment.ICreate, providing an initial `reason`.
 *    Capture the created assignment including `id`, `reason`, and
 *    `granted_by_admin_id` (which may be set by the backend to A's id or left
 *    null).
 * 5. Call PUT /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId}
 *    with a body that only sets a new `reason` and omits `granted_by_admin_id`
 *    from the IShoppingMallAdminRoleAssignment.IUpdate payload.
 * 6. Assert that:
 *
 *    - The response is a valid IShoppingMallAdminRoleAssignment
 *    - `id`, `shopping_mall_admin_id`, and `shopping_mall_admin_role_id` remain
 *         unchanged
 *    - `reason` is updated to the new value
 *    - `granted_by_admin_id` is equal to the original value (no change)
 * 7. Perform a second partial update where only `granted_by_admin_id` is changed
 *    and `reason` is omitted from the IUpdate body. For example, set
 *    `granted_by_admin_id` explicitly to admin A's id or to null.
 * 8. Assert that after this second update:
 *
 *    - `reason` still equals the value set in step 5
 *    - `granted_by_admin_id` reflects the new value from step 7
 *
 * All API responses must be validated with typia.assert, and business
 * assertions must use TestValidator with descriptive titles.
 */
export async function test_api_admin_role_assignment_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Register admin A (grantor/admin context)
  const adminJoinBodyA = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyA,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // 2. Create an admin role under admin A
  const roleCreateBody = typia.random<IShoppingMallAdminRole.ICreate>();
  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(role);

  // 3. Register admin B (grantee admin)
  const adminJoinBodyB = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyB,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  // 4. Create initial role assignment for admin B under the role created
  const initialReason = RandomGenerator.paragraph({ sentences: 3 });
  const assignmentCreateBody = {
    admin_id: adminB.id,
    reason: initialReason,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const initialAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(initialAssignment);

  // Capture baseline fields
  const originalAssignmentId = initialAssignment.id;
  const originalAdminId = initialAssignment.shopping_mall_admin_id;
  const originalRoleId = initialAssignment.shopping_mall_admin_role_id;
  const originalReason = initialAssignment.reason ?? null;
  const originalGrantedBy =
    initialAssignment.granted_by_admin_id === undefined
      ? null
      : initialAssignment.granted_by_admin_id;

  // 5. First partial update: update only reason, omit granted_by_admin_id
  const updatedReason = RandomGenerator.paragraph({ sentences: 4 });
  const firstUpdateBody = {
    reason: updatedReason,
    // granted_by_admin_id intentionally omitted to test partial update
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const afterFirstUpdate: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: originalAssignmentId,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(afterFirstUpdate);

  // Assertions for first partial update
  TestValidator.equals(
    "assignment id remains unchanged after reason-only update",
    afterFirstUpdate.id,
    originalAssignmentId,
  );
  TestValidator.equals(
    "assigned admin id remains unchanged after reason-only update",
    afterFirstUpdate.shopping_mall_admin_id,
    originalAdminId,
  );
  TestValidator.equals(
    "assigned role id remains unchanged after reason-only update",
    afterFirstUpdate.shopping_mall_admin_role_id,
    originalRoleId,
  );
  TestValidator.equals(
    "reason is updated when provided in partial update",
    afterFirstUpdate.reason ?? null,
    updatedReason,
  );
  TestValidator.equals(
    "granted_by_admin_id remains unchanged when omitted in partial update",
    afterFirstUpdate.granted_by_admin_id === undefined
      ? null
      : afterFirstUpdate.granted_by_admin_id,
    originalGrantedBy,
  );

  // 7. Second partial update: update only granted_by_admin_id, omit reason
  // Decide new granted_by_admin_id: set explicitly to admin A's id
  const newGrantedBy = adminA.id;
  const secondUpdateBody = {
    granted_by_admin_id: newGrantedBy,
    // reason intentionally omitted
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const afterSecondUpdate: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: originalAssignmentId,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(afterSecondUpdate);

  // Assertions for second partial update
  TestValidator.equals(
    "assignment id remains unchanged after granted_by_admin_id-only update",
    afterSecondUpdate.id,
    originalAssignmentId,
  );
  TestValidator.equals(
    "assigned admin id remains unchanged after granted_by_admin_id-only update",
    afterSecondUpdate.shopping_mall_admin_id,
    originalAdminId,
  );
  TestValidator.equals(
    "assigned role id remains unchanged after granted_by_admin_id-only update",
    afterSecondUpdate.shopping_mall_admin_role_id,
    originalRoleId,
  );
  TestValidator.equals(
    "reason remains unchanged when omitted in granted_by_admin_id-only update",
    afterSecondUpdate.reason ?? null,
    updatedReason,
  );
  TestValidator.equals(
    "granted_by_admin_id is updated when provided in partial update",
    afterSecondUpdate.granted_by_admin_id === undefined
      ? null
      : afterSecondUpdate.granted_by_admin_id,
    newGrantedBy,
  );
}
