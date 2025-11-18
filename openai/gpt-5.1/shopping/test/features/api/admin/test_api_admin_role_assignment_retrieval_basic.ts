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
 * Basic retrieval of a specific admin role assignment by ID.
 *
 * Business purpose
 *
 * - Ensure that once an admin role assignment has been created for a given admin
 *   and role, administrators can later retrieve it by its unique identifier.
 * - Validate that the payload returned by GET
 *   /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId} matches
 *   the assignment that was created through the role-assignment creation
 *   endpoint.
 *
 * Scenario steps
 *
 * 1. Register an administrator using POST /auth/admin/join. This both creates the
 *    underlying shopping_mall_admins record and establishes an authenticated
 *    context by attaching the access token to the connection.
 * 2. Create a new admin role using POST /shoppingMall/admin/adminRoles with a
 *    unique, random role code so that we have a concrete role to assign.
 * 3. Create a role assignment using POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments, passing an
 *    IShoppingMallAdminRoleAssignment.ICreate body that targets the joined
 *    admin.
 * 4. Invoke GET /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId}
 *    using the ID returned in step 3.
 * 5. Assert that the response is a valid IShoppingMallAdminRoleAssignment and its
 *    key fields (id, shopping_mall_admin_id, created_at, updated_at,
 *    deleted_at) are consistent with the created assignment.
 */
export async function test_api_admin_role_assignment_retrieval_basic(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an admin role with a unique code
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(role);

  // 3. Create an admin role assignment for the joined admin
  const assignmentReason = RandomGenerator.paragraph({ sentences: 3 });

  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: {
          admin_id: adminAuthorized.id,
          reason: assignmentReason,
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(createdAssignment);

  // Sanity checks on created assignment
  TestValidator.equals(
    "created assignment admin id should match joined admin",
    createdAssignment.shopping_mall_admin_id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "created assignment reason should match input reason",
    createdAssignment.reason ?? null,
    assignmentReason,
  );

  // 4. Retrieve the assignment by ID
  const retrieved: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.at(
      connection,
      {
        adminRoleAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(retrieved);

  // 5. Validate that retrieved assignment matches the created one
  TestValidator.equals(
    "retrieved assignment id should equal created assignment id",
    retrieved.id,
    createdAssignment.id,
  );
  TestValidator.equals(
    "retrieved assignment admin id should equal joined admin id",
    retrieved.shopping_mall_admin_id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "retrieved assignment role id should equal created assignment role id",
    retrieved.shopping_mall_admin_role_id,
    createdAssignment.shopping_mall_admin_role_id,
  );

  TestValidator.equals(
    "retrieved assignment created_at should equal created assignment created_at",
    retrieved.created_at,
    createdAssignment.created_at,
  );
  TestValidator.equals(
    "retrieved assignment updated_at should equal created assignment updated_at",
    retrieved.updated_at,
    createdAssignment.updated_at,
  );

  TestValidator.equals(
    "retrieved assignment deleted_at should match created assignment deleted_at (expect null for active)",
    retrieved.deleted_at ?? null,
    createdAssignment.deleted_at ?? null,
  );

  TestValidator.equals(
    "retrieved assignment reason should equal created assignment reason",
    retrieved.reason ?? null,
    createdAssignment.reason ?? null,
  );

  TestValidator.equals(
    "retrieved assignment granted_by_admin_id should equal created assignment granted_by_admin_id",
    retrieved.granted_by_admin_id ?? null,
    createdAssignment.granted_by_admin_id ?? null,
  );
}
