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
 * Validate authorization enforcement on admin role assignment deletion.
 *
 * Business goal
 *
 * - Ensure that only properly authenticated admin actors can delete admin role
 *   assignments.
 * - Verify that unauthenticated requests are rejected and do not affect role
 *   assignment data.
 *
 * High level steps
 *
 * 1. Join as an initial admin (admin A) via POST /auth/admin/join, which also sets
 *    the Authorization header on the connection.
 * 2. As admin A, create an admin role via POST /shoppingMall/admin/adminRoles.
 * 3. Join again to create a second admin (admin B) to act as the assignee. The SDK
 *    overwrites connection.headers.Authorization with the new token.
 * 4. As the currently authenticated admin (admin B), create an admin role
 *    assignment under the created role with POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments, and capture
 *    its id.
 * 5. Attempt to delete the assignment using an unauthenticated connection (no
 *    Authorization header). Expect an error via TestValidator.error and ensure
 *    that the local assignment id remains unchanged.
 * 6. Perform the delete with a valid authenticated admin connection and expect the
 *    call to succeed.
 * 7. Attempt a second delete on the same id and expect an error, which serves as a
 *    proxy for "404 on subsequent GET" semantics with the available API
 *    surface.
 */
export async function test_api_admin_role_assignment_delete_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Join as initial admin A
  const adminJoinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyA,
    });
  typia.assert(adminAuthorizedA);

  TestValidator.predicate(
    "admin A id must be uuid",
    () => !!adminAuthorizedA.id && typeof adminAuthorizedA.id === "string",
  );

  // 2. Create an admin role as admin A
  const roleCode = `role_${RandomGenerator.alphaNumeric(8)}`;
  const roleCreateBody = {
    code: roleCode,
    name: `Role ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const adminRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert(adminRole);

  TestValidator.equals(
    "created role code should match input",
    adminRole.code,
    roleCode,
  );

  // 3. Join again as admin B (assignee) - this overwrites Authorization
  const adminJoinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyB,
    });
  typia.assert(adminAuthorizedB);

  TestValidator.predicate(
    "admin B id must be uuid",
    () => !!adminAuthorizedB.id && typeof adminAuthorizedB.id === "string",
  );

  // 4. Create a role assignment for admin B under the created role code
  const assignmentCreateBody = {
    admin_id: adminAuthorizedB.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleCode,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  const assignmentId: string & tags.Format<"uuid"> = assignment.id;
  TestValidator.predicate(
    "assignment id should be non-empty uuid string",
    () => !!assignmentId && typeof assignmentId === "string",
  );

  // 5. Attempt erase with an unauthenticated connection (no Authorization)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection should not delete admin role assignment",
    async () => {
      await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
        unauthenticatedConnection,
        {
          adminRoleAssignmentId: assignmentId,
        },
      );
    },
  );

  // Ensure local assignment reference is still consistent
  TestValidator.equals(
    "assignment id must remain unchanged after unauthenticated attempt",
    assignment.id,
    assignmentId,
  );

  // 6. Perform erase with the valid authenticated admin connection
  await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
    connection,
    {
      adminRoleAssignmentId: assignmentId,
    },
  );

  // 7. Second deletion attempt should fail (proxy for 404-after-delete)
  await TestValidator.error(
    "second delete attempt should fail for already erased assignment",
    async () => {
      await api.functional.shoppingMall.admin.adminRoleAssignments.erase(
        connection,
        {
          adminRoleAssignmentId: assignmentId,
        },
      );
    },
  );
}
