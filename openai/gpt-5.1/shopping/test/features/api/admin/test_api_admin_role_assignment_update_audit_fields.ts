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
 * Validate audit timestamp behavior when updating an admin role assignment.
 *
 * Business purpose:
 *
 * - Ensure that when an admin updates an existing role assignment, the
 *   system-managed audit timestamps behave correctly: created_at remains
 *   immutable, while updated_at reflects the most recent modification.
 * - Confirm that the client can only modify business fields exposed in
 *   IShoppingMallAdminRoleAssignment.IUpdate (reason, granted_by_admin_id) and
 *   cannot directly control created_at/updated_at.
 *
 * End-to-end workflow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context and admin id.
 * 2. Create an admin role via POST /shoppingMall/admin/adminRoles.
 * 3. Create an admin role assignment under that role via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments, targeting the
 *    newly created admin.
 * 4. Capture the initial created_at and updated_at values from the
 *    IShoppingMallAdminRoleAssignment response.
 * 5. Update the role assignment via PUT
 *    /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId} using
 *    IShoppingMallAdminRoleAssignment.IUpdate to change the reason and
 *    optionally granted_by_admin_id.
 * 6. Assert that:
 *
 *    - Created_at is identical before and after the update.
 *    - Updated_at has changed to a different value.
 *    - Updated business fields (e.g., reason, granted_by_admin_id) match the update
 *         payload.
 */
export async function test_api_admin_role_assignment_update_audit_fields(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an admin role to assign to this admin
  const roleBody = typia.random<IShoppingMallAdminRole.ICreate>();
  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(role);

  // 3. Create an admin role assignment for the authorized admin
  const initialReason: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const assignmentCreateBody = {
    admin_id: authorizedAdmin.id,
    reason: initialReason,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  const originalCreatedAt = createdAssignment.created_at;
  const originalUpdatedAt = createdAssignment.updated_at;

  // 4. Perform an update on the assignment's business fields
  const updatedReason: string = RandomGenerator.paragraph({
    sentences: 2,
  });

  const updateBody = {
    reason: updatedReason,
    granted_by_admin_id: authorizedAdmin.id,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const updatedAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: createdAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // 5. Business and audit assertions
  // 5-1. created_at must remain unchanged after the update
  TestValidator.equals(
    "created_at should remain unchanged after role assignment update",
    updatedAssignment.created_at,
    originalCreatedAt,
  );

  // 5-2. updated_at must change after the update
  TestValidator.notEquals(
    "updated_at should change after role assignment update",
    updatedAssignment.updated_at,
    originalUpdatedAt,
  );

  // 5-3. reason should reflect the updated value
  TestValidator.equals(
    "reason should be updated to the new value",
    updatedAssignment.reason,
    updatedReason,
  );

  // 5-4. granted_by_admin_id should match the value from the update payload
  TestValidator.equals(
    "granted_by_admin_id should be updated to the admin id",
    updatedAssignment.granted_by_admin_id,
    authorizedAdmin.id,
  );
}
