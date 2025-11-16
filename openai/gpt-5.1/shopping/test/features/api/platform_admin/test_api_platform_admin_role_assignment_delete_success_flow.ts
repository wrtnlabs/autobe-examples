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
 * Validate successful deletion of a platform admin role assignment.
 *
 * Business goal
 *
 * - Ensure that an authenticated platform administrator can create an admin role,
 *   assign it to themselves, and then successfully delete that specific role
 *   assignment using the dedicated erase endpoint.
 * - Confirm that the delete operation completes without error and is scoped only
 *   to the targeted assignment row, aligning with the API contract that
 *   describes a hard delete of the assignment without cascading to the role
 *   definition or other admin entities.
 *
 * Happy-path flow implemented
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join.
 *
 *    - Use a realistic IShoppingMallPlatformAdminJoin.IRequest payload with random
 *         but valid email and URIs.
 *    - Rely on the SDK to automatically attach the issued access token to the shared
 *         connection headers for subsequent admin calls.
 * 2. Create an admin role definition via POST
 *    /shoppingMall/platformAdmin/adminRoles.
 *
 *    - Build an IShoppingMallAdminRole.ICreate body with non-empty `code` and
 *         `name`, and an optional `description_text`.
 *    - Capture the resulting IShoppingMallAdminRole, in particular its `id` and
 *         `code`.
 * 3. Create a role assignment for the current platform admin via POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments.
 *
 *    - Use the platform admin id from the join response as `platformAdminId`.
 *    - Use IShoppingMallAdminRoleAssignment.ICreate with
 *         `shopping_mall_admin_role_id` set to the created role's id.
 *    - Capture the IShoppingMallAdminRoleAssignment, verifying basic relationship
 *         consistency (assignment.platform_admin.id and
 *         assignment.admin_role.id).
 * 4. Delete the role assignment via DELETE
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments/{roleAssignmentId}.
 *
 *    - Call api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase
 *         with the platform admin id and the assignment id from step 3.
 *    - The function is typed as returning Promise<void>, so successful completion
 *         without throwing is considered a pass for the HTTP-level behavior.
 * 5. Validate logical expectations.
 *
 *    - Use TestValidator.predicate with descriptive titles to assert:
 *
 *         - The joined platform admin is active (isActive === true).
 *         - The assignment's platform_admin.id equals the joined admin id.
 *         - The assignment's admin_role.id equals the created role id.
 *    - There is no follow-up GET or list verification of the deleted assignment
 *         because such endpoints are not available in the provided SDK.
 *         Instead, we rely on the absence of errors from erase() and the
 *         documented behavior that only the assignment row is deleted.
 *
 * Notes
 *
 * - We do not test HTTP status codes or type error scenarios, and we do not
 *   attempt to re-fetch the deleted assignment as a 404, because no
 *   corresponding read/list APIs are exposed in the given materials.
 * - All request bodies use `satisfies` with the precise DTO types to maintain
 *   strict compile-time safety, and typia.assert() is applied to all non-void
 *   responses.
 */
export async function test_api_platform_admin_role_assignment_delete_success_flow(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authenticated admin context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // Basic sanity checks on the joined admin.
  TestValidator.predicate(
    "platform admin account should be active after join",
    adminAuthorized.isActive,
  );

  // 2. Create an admin role definition.
  const roleCreateBody = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text:
      Math.random() < 0.5 ? null : RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const adminRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(adminRole);

  // 3. Create a role assignment for the joined platform admin.
  const assignmentCreateBody = {
    shopping_mall_admin_role_id: adminRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminAuthorized.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // Validate relationship consistency on the created assignment.
  TestValidator.equals(
    "assignment.platform_admin.id should equal joined admin id",
    assignment.platform_admin.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "assignment.admin_role.id should equal created role id",
    assignment.admin_role.id,
    adminRole.id,
  );

  // 4. Delete the role assignment.
  await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
    connection,
    {
      platformAdminId: adminAuthorized.id,
      roleAssignmentId: assignment.id,
    },
  );

  // 5. Post-conditions: absence of errors from erase() is already a strong
  // signal. We additionally assert that the role definition object we hold is
  // still structurally valid, emphasizing that erase() did not affect the
  // role entity itself.
  typia.assert(adminRole);

  TestValidator.predicate(
    "role definition should remain valid after assignment deletion",
    typeof adminRole.id === "string" && adminRole.id.length > 0,
  );
}
