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

export async function test_api_admin_role_assignments_index_include_deleted(
  connection: api.IConnection,
) {
  // 1. Register two admins to act as assignment targets and to obtain admin auth context
  const joinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized1: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody1,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized1);

  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody2,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized2);

  // 2. Create an admin role under the first admin's context (connection already has Authorization header)
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;
  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert<IShoppingMallAdminRole>(role);

  // 3. Create two assignments for that role, targeting the two admins we just created
  const assignmentBody1 = {
    admin_id: adminAuthorized1.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;
  const assignment1: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentBody1,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment1);

  const assignmentBody2 = {
    admin_id: adminAuthorized2.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;
  const assignment2: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentBody2,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment2);

  // Helper to search for our assignments in an index response
  const assertAssignmentsPresent = (
    page: IPageIShoppingMallAdminRoleAssignment.ISummary,
    titlePrefix: string,
  ): void => {
    const ids = page.data.map((d) => d.id);
    TestValidator.predicate(
      `${titlePrefix}: first assignment is included`,
      ids.includes(assignment1.id),
    );
    TestValidator.predicate(
      `${titlePrefix}: second assignment is included`,
      ids.includes(assignment2.id),
    );
  };

  // 4. Index assignments WITHOUT include_deleted (omitted) and validate only active assignments for this role
  const indexRequestWithoutIncludeDeleted = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: undefined,
    role_code: undefined,
    granted_by_admin_id: undefined,
    created_from: undefined,
    created_to: undefined,
    include_deleted: undefined,
    sort_by: undefined,
    sort_order: undefined,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;
  const pageWithoutIncludeDeleted: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode: role.code,
        body: indexRequestWithoutIncludeDeleted,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(
    pageWithoutIncludeDeleted,
  );

  // Basic pagination checks
  TestValidator.equals(
    "pagination current page should be 0 when requesting page 0",
    pageWithoutIncludeDeleted.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should match requested limit (10)",
    pageWithoutIncludeDeleted.pagination.limit,
    10,
  );

  // Every returned assignment must belong to the requested role and be non-deleted
  for (const summary of pageWithoutIncludeDeleted.data) {
    typia.assert<IShoppingMallAdminRoleAssignment.ISummary>(summary);
    TestValidator.equals(
      "all assignments should be for the specified role (code)",
      summary.role.code,
      role.code,
    );
    TestValidator.equals(
      "when include_deleted is omitted, deleted_at must be null",
      summary.deleted_at ?? null,
      null,
    );
  }

  assertAssignmentsPresent(
    pageWithoutIncludeDeleted,
    "index without include_deleted",
  );

  // 5. Index assignments WITH include_deleted explicitly set to false
  const indexRequestIncludeDeletedFalse = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: undefined,
    role_code: undefined,
    granted_by_admin_id: undefined,
    created_from: undefined,
    created_to: undefined,
    include_deleted: false,
    sort_by: undefined,
    sort_order: undefined,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;
  const pageIncludeDeletedFalse: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode: role.code,
        body: indexRequestIncludeDeletedFalse,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(
    pageIncludeDeletedFalse,
  );

  TestValidator.equals(
    "pagination current page should be 0 when requesting page 0 (include_deleted=false)",
    pageIncludeDeletedFalse.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should match requested limit (10) when include_deleted=false",
    pageIncludeDeletedFalse.pagination.limit,
    10,
  );

  for (const summary of pageIncludeDeletedFalse.data) {
    typia.assert<IShoppingMallAdminRoleAssignment.ISummary>(summary);
    TestValidator.equals(
      "all assignments (include_deleted=false) should be for the specified role (code)",
      summary.role.code,
      role.code,
    );
    TestValidator.equals(
      "when include_deleted=false, deleted_at must be null",
      summary.deleted_at ?? null,
      null,
    );
  }

  assertAssignmentsPresent(
    pageIncludeDeletedFalse,
    "index with include_deleted=false",
  );

  // 6. Index assignments WITH include_deleted explicitly set to true
  const indexRequestIncludeDeletedTrue = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: undefined,
    role_code: undefined,
    granted_by_admin_id: undefined,
    created_from: undefined,
    created_to: undefined,
    include_deleted: true,
    sort_by: undefined,
    sort_order: undefined,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;
  const pageIncludeDeletedTrue: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode: role.code,
        body: indexRequestIncludeDeletedTrue,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(
    pageIncludeDeletedTrue,
  );

  // We cannot guarantee existence of logically deleted assignments without a delete API,
  // but we can at least ensure that active assignments remain visible when include_deleted=true
  assertAssignmentsPresent(
    pageIncludeDeletedTrue,
    "index with include_deleted=true should still contain active assignments",
  );
}
