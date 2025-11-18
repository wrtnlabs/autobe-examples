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
 * Enforce authorization for admin role assignment updates.
 *
 * Business purpose:
 *
 * - Ensure that updates to admin role assignments are privileged operations
 *   restricted to authenticated admin actors only.
 * - Verify that an unauthenticated client cannot successfully update an existing
 *   admin role assignment record.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context on the provided connection.
 * 2. Create an admin role using POST /shoppingMall/admin/adminRoles with a random,
 *    unique role code.
 * 3. Create a role assignment under that role for the same admin via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments.
 * 4. Prepare a minimal IShoppingMallAdminRoleAssignment.IUpdate payload that
 *    updates only the `reason` field.
 * 5. Clone the connection into an unauthenticated connection by resetting headers
 *    to an empty object, without otherwise mutating the original connection
 *    reference.
 * 6. Call PUT /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId}
 *    with the unauthenticated connection and expect a runtime failure. Use
 *    TestValidator.error to assert that the call throws, without asserting any
 *    particular HTTP status code or error message.
 * 7. Using the original (authenticated) connection, call the same PUT endpoint
 *    with the same update payload and expect success. Assert with typia.assert
 *    that the response matches IShoppingMallAdminRoleAssignment.
 * 8. Use TestValidator.equals to verify that the `reason` field on the updated
 *    assignment equals the new value from the update payload.
 */
export async function test_api_admin_role_assignment_update_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register an admin (authenticated context bound to `connection`).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an admin role.
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert(role);

  // 3. Create a role assignment for the joined admin.
  const assignmentCreateBody = {
    admin_id: authorizedAdmin.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Prepare update payload for the assignment.
  const updatedReason = RandomGenerator.paragraph({ sentences: 2 });
  const updateBody = {
    reason: updatedReason,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  // 5. Create an unauthenticated connection clone.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt unauthorized update and expect an error.
  await TestValidator.error("unauthenticated update must fail", async () => {
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      unauthenticated,
      {
        adminRoleAssignmentId: createdAssignment.id,
        body: updateBody,
      },
    );
  });

  // 7. Perform authorized update on the original authenticated connection.
  const updatedAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: createdAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // 8. Verify that the reason field has been updated as expected.
  TestValidator.equals(
    "authorized update should change reason field",
    updatedAssignment.reason,
    updatedReason,
  );
}
