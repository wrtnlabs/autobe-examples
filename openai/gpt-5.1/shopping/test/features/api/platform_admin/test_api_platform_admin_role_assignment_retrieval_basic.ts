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
 * Basic retrieval of a specific platform admin role assignment.
 *
 * Business goal
 *
 * - Ensure that an authenticated platform administrator can retrieve a specific
 *   role assignment scoped by platformAdminId and roleAssignmentId.
 * - Verify that the assignment returned by the GET endpoint is consistent with
 *   the one returned at creation time.
 *
 * Steps
 *
 * 1. Register (join) a platform administrator using POST /auth/platformAdmin/join.
 *    This both creates the admin identity and authenticates the connection.
 * 2. Create an admin role definition using POST
 *    /shoppingMall/platformAdmin/adminRoles.
 * 3. Create a role assignment for the joined platform admin via POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments.
 * 4. Retrieve that same assignment via GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments/{roleAssignmentId}.
 * 5. Assert that the retrieved assignment matches the created one in id,
 *    platform_admin summary, admin_role summary, and lifecycle timestamps.
 */
export async function test_api_platform_admin_role_assignment_retrieval_basic(
  connection: api.IConnection,
) {
  // 1. Join (register) a platform administrator, establishing an authenticated session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create an admin role definition.
  const roleCreateBody = typia.random<IShoppingMallAdminRole.ICreate>();

  const adminRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRole>(adminRole);

  // 3. Create a role assignment for the joined platform admin.
  const assignmentCreateBody = {
    shopping_mall_admin_role_id: adminRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: authorizedAdmin.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(createdAssignment);

  // Basic structural sanity checks on the created assignment.
  TestValidator.equals(
    "created assignment platform_admin.id should match joined admin id",
    createdAssignment.platform_admin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "created assignment admin_role.id should match created role id",
    createdAssignment.admin_role.id,
    adminRole.id,
  );

  TestValidator.predicate(
    "created assignment assigned_at should be a non-empty string",
    createdAssignment.assigned_at.length > 0,
  );

  TestValidator.predicate(
    "created assignment revoked_at should be null or undefined on creation",
    createdAssignment.revoked_at === null ||
      createdAssignment.revoked_at === undefined,
  );

  // 4. Retrieve the same assignment via GET.
  const retrievedAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.at(
      connection,
      {
        platformAdminId: authorizedAdmin.id,
        roleAssignmentId: createdAssignment.id,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(retrievedAssignment);

  // 5. Validate that retrieved assignment matches created assignment.
  TestValidator.equals(
    "retrieved assignment id should equal created assignment id",
    retrievedAssignment.id,
    createdAssignment.id,
  );

  TestValidator.equals(
    "retrieved platform_admin.id should equal created platform_admin.id",
    retrievedAssignment.platform_admin.id,
    createdAssignment.platform_admin.id,
  );

  TestValidator.equals(
    "retrieved admin_role.id should equal created admin_role.id",
    retrievedAssignment.admin_role.id,
    createdAssignment.admin_role.id,
  );

  TestValidator.equals(
    "retrieved assigned_at should equal created assigned_at",
    retrievedAssignment.assigned_at,
    createdAssignment.assigned_at,
  );

  TestValidator.equals(
    "retrieved revoked_at should equal created revoked_at",
    retrievedAssignment.revoked_at ?? null,
    createdAssignment.revoked_at ?? null,
  );

  TestValidator.predicate(
    "retrieved assignment revoked_at should still be null or undefined",
    retrievedAssignment.revoked_at === null ||
      retrievedAssignment.revoked_at === undefined,
  );
}
