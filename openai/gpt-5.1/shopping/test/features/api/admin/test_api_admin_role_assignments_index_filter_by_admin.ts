import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleAssignment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

/**
 * Validate filtering of admin role assignments by admin_id within a specific
 * role.
 *
 * Business context: The shopping mall platform uses an RBAC system where
 * administrators can be assigned roles via
 * shopping_mall_admin_role_assignments. The index endpoint for a given role
 * (PATCH /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments) supports
 * filtering by the target admin account via the admin_id field in
 * IShoppingMallAdminRoleAssignment.IRequest. Governance tooling depends on this
 * filter to inspect which admins currently (or historically) hold a specific
 * role.
 *
 * This test ensures that when an admin_id filter is supplied, the endpoint
 * returns only assignments for that specific admin under the given role and
 * does not leak assignments of other admins, even though they share the same
 * role.
 *
 * Scenario steps:
 *
 * 1. Register two admin accounts using POST /auth/admin/join and capture their ids
 *    (from IShoppingMallAdmin.IAuthorized.id). The first join uses the incoming
 *    connection and establishes the authenticated admin-1 context.
 * 2. For the second admin, clone the connection and perform join on the clone so
 *    the original connection remains authenticated as admin-1.
 * 3. As the first admin (original connection), create an admin role via POST
 *    /shoppingMall/admin/adminRoles and record its code.
 * 4. Using the first admin’s authenticated connection, create two assignments
 *    under that role via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments:
 *
 *    - One assignment targeting the first admin_id.
 *    - One assignment targeting the second admin_id.
 * 5. Call PATCH /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments with
 *    body: IShoppingMallAdminRoleAssignment.IRequest specifying page=0, limit
 *    large enough (e.g., 10), and admin_id set to the first admin’s id.
 * 6. Verify via typia.assert that the response is a valid
 *    IPageIShoppingMallAdminRoleAssignment.ISummary object.
 * 7. Use TestValidator to assert business rules:
 *
 *    - At least one assignment is returned for the first admin.
 *    - All returned summary entries have admin.id equal to firstAdminId.
 *    - All returned summary entries have role.code equal to the created role’s code.
 *    - No entry has admin.id equal to secondAdminId.
 */
export async function test_api_admin_role_assignments_index_filter_by_admin(
  connection: api.IConnection,
) {
  // 1. Register first admin on the original connection (becomes admin-1 context)
  const joinInput1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinInput1,
    });
  typia.assert(admin1);

  const firstAdminId: string & tags.Format<"uuid"> = admin1.id;

  // 2. Register second admin using a cloned connection so that
  //    the original connection remains authenticated as admin-1.
  const connectionForAdmin2: api.IConnection = {
    ...connection,
  };

  const joinInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connectionForAdmin2, {
      body: joinInput2,
    });
  typia.assert(admin2);

  const secondAdminId: string & tags.Format<"uuid"> = admin2.id;

  // 3. Create an admin role as the first admin (original connection)
  const roleCreateInput = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateInput,
    });
  typia.assert(createdRole);

  const roleCode: string = createdRole.code;

  // 4. Create assignments for first and second admin under the same role
  const assignmentForFirstInput = {
    admin_id: firstAdminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentForFirst: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleCode,
        body: assignmentForFirstInput,
      },
    );
  typia.assert(assignmentForFirst);

  const assignmentForSecondInput = {
    admin_id: secondAdminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentForSecond: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: roleCode,
        body: assignmentForSecondInput,
      },
    );
  typia.assert(assignmentForSecond);

  // 5. Index assignments filtered by admin_id = firstAdminId
  const indexRequestBody = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: firstAdminId,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const page: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode: roleCode,
        body: indexRequestBody,
      },
    );
  typia.assert(page);

  const summaries: IShoppingMallAdminRoleAssignment.ISummary[] = page.data;

  // 6. Business rule assertions
  TestValidator.predicate(
    "at least one assignment for first admin should be returned",
    summaries.length > 0,
  );

  for (const summary of summaries) {
    // All assignments must belong to first admin
    TestValidator.equals(
      "every summary.admin.id must equal firstAdminId",
      summary.admin.id,
      firstAdminId,
    );

    // All assignments must belong to the created role code
    TestValidator.equals(
      "every summary.role.code must equal created role code",
      summary.role.code,
      roleCode,
    );

    // Ensure no assignment belongs to second admin
    TestValidator.notEquals(
      "no summary.admin.id should equal secondAdminId",
      summary.admin.id,
      secondAdminId,
    );
  }
}
