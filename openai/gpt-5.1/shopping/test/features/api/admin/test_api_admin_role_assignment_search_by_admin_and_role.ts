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
 * Validate admin role assignment search filtered by admin and role.
 *
 * Business goal: Ensure that an authenticated administrator can search role
 * assignment records using both a specific admin and role filter, and that the
 * result set and pagination metadata only reflect assignments matching those
 * criteria.
 *
 * Scenario steps:
 *
 * 1. Register the primary admin (adminA) using POST /auth/admin/join. This admin
 *    will own the session and perform all subsequent RBAC operations.
 * 2. Register a secondary admin (adminB) using POST /auth/admin/join. This admin
 *    will receive an assignment for the same role but must not appear in the
 *    filtered search when filtering by adminA.
 * 3. Using adminA's authenticated connection, create an admin role via POST
 *    /shoppingMall/admin/adminRoles with a unique code and descriptive name.
 * 4. Under the created role, create two assignments via POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments:
 *
 *    - One assignment for adminA.
 *    - One assignment for adminB.
 * 5. Call PATCH /shoppingMall/admin/adminRoleAssignments with an
 *    IShoppingMallAdminRoleAssignment.IRequest body that:
 *
 *    - Requests the first page (page = 0) with a generous limit (e.g. 10).
 *    - Sets admin_id to adminA's id.
 *    - Sets role_code to the created role's code.
 *    - Sets sort_by to "created_at" and sort_order to "desc".
 * 6. Validate that the returned IPageIShoppingMallAdminRoleAssignment.ISummary:
 *
 *    - Passes typia.assert for full type safety.
 *    - Has pagination.current === 0 and pagination.limit === 10.
 *    - Has pagination.records equal to data.length.
 *    - Has pagination.pages === 1 when data.length <= limit.
 *    - Contains at least one summary whose admin.id matches adminA.id and whose
 *         role.code matches the created role's code.
 *    - Does not contain any summary whose admin.id matches adminB.id.
 */
export async function test_api_admin_role_assignment_search_by_admin_and_role(
  connection: api.IConnection,
) {
  // 1. Register primary admin (adminA) who will manage roles and assignments
  const adminAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // any string is fine; Format<"password"> is logical-only
    ip: undefined,
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // Ensure we have a stable adminA id (prefer nested summary if present)
  const adminAId: string & tags.Format<"uuid"> = (adminA.admin?.id ??
    adminA.id) as string & tags.Format<"uuid">;

  // 2. Register secondary admin (adminB); join() will temporarily overwrite
  // the Authorization header, but subsequent privileged calls will still be
  // authorized as an admin actor, which is sufficient for this test.
  const adminBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // same format reasoning as above
    ip: undefined,
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  const adminBId: string & tags.Format<"uuid"> = (adminB.admin?.id ??
    adminB.id) as string & tags.Format<"uuid">;

  // 3. Create an admin role that will be assigned to both admins
  const roleCode = `role_${RandomGenerator.alphaNumeric(8)}`;
  const roleName = RandomGenerator.paragraph({ sentences: 2 });

  const roleBody = {
    code: roleCode,
    name: roleName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(role);

  // 4. Create role assignments for adminA and adminB under this role
  const assignmentForAdminA: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: {
          admin_id: adminAId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(assignmentForAdminA);

  const assignmentForAdminB: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: {
          admin_id: adminBId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRoleAssignment.ICreate,
      },
    );
  typia.assert(assignmentForAdminB);

  // 5. Search assignments filtered by adminA and role code
  const requestBody = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: adminAId,
    role_code: role.code,
    granted_by_admin_id: undefined,
    created_from: undefined,
    created_to: undefined,
    include_deleted: false,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const page: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoleAssignments.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  const { pagination, data } = page;

  // 6. Validate pagination semantics
  TestValidator.equals(
    "pagination current page should be 0",
    pagination.current,
    0,
  );
  TestValidator.equals("pagination limit should be 10", pagination.limit, 10);
  TestValidator.equals(
    "pagination records should equal data length",
    pagination.records,
    data.length,
  );

  // When all records fit within the limit, pages should be 1
  if (data.length <= requestBody.limit) {
    TestValidator.equals(
      "pagination pages should be 1 when all records fit on one page",
      pagination.pages,
      1,
    );
  }

  // 7. Business validations: assignments are correctly filtered
  // Ensure at least one assignment for adminA and the created role exists
  const hasAdminARoleAssignment = data.some((summary) => {
    return summary.admin.id === adminAId && summary.role.code === role.code;
  });

  TestValidator.predicate(
    "result must contain at least one assignment for adminA and the created role",
    hasAdminARoleAssignment,
  );

  // Ensure no assignments for adminB are returned in this filtered search
  const hasAdminBRoleAssignment = data.some((summary) => {
    return summary.admin.id === adminBId;
  });

  TestValidator.predicate(
    "result must not contain assignments for adminB when filtering by adminA",
    hasAdminBRoleAssignment === false,
  );
}
