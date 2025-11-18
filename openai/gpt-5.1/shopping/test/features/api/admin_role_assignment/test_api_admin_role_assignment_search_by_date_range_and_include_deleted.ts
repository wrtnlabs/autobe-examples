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
 * Validate admin role assignment searching by created_at date range and
 * include_deleted flag.
 *
 * Business flow:
 *
 * 1. Join an admin (POST /auth/admin/join) to obtain an authorized admin context.
 * 2. Create an admin role (POST /shoppingMall/admin/adminRoles) with a unique
 *    code.
 * 3. Create two role assignments for the same admin under the role (POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments).
 * 4. Logically delete one assignment via PUT
 *    /shoppingMall/admin/adminRoleAssignments/{adminRoleAssignmentId} so its
 *    deleted_at becomes non-null.
 * 5. Search assignments via PATCH /shoppingMall/admin/adminRoleAssignments with a
 *    created_at window and include_deleted=true, and assert both active and
 *    deleted assignments appear.
 * 6. Search again with include_deleted omitted/false and assert only the active
 *    assignment appears.
 * 7. Verify sort_by/sort_order (created_at desc) so the newer assignment is listed
 *    first among our test assignments.
 */
export async function test_api_admin_role_assignment_search_by_date_range_and_include_deleted(
  connection: api.IConnection,
) {
  // 1. Join admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Create an admin role
  const roleCodeBase = RandomGenerator.alphaNumeric(8);
  const roleBody = {
    code: roleCodeBase,
    name: `Role ${roleCodeBase}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert(role);

  // 3. Create two assignments for the same admin and role
  const assignmentBody1 = {
    admin_id: authorized.id,
    reason: "first assignment",
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment1: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentBody1,
      },
    );
  typia.assert(assignment1);

  // slight delay to ensure distinguishable created_at ordering
  const delayMs = 10;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const assignmentBody2 = {
    admin_id: authorized.id,
    reason: "second assignment",
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment2: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentBody2,
      },
    );
  typia.assert(assignment2);

  // Determine newer vs older by created_at
  const newerAssignment =
    assignment1.created_at <= assignment2.created_at
      ? assignment2
      : assignment1;
  const olderAssignment =
    newerAssignment.id === assignment1.id ? assignment2 : assignment1;

  // 4. Logically delete (revoke) the older assignment
  const updateBody = {
    reason: `${olderAssignment.reason ?? ""} (revoked)`,
    granted_by_admin_id: authorized.id,
  } satisfies IShoppingMallAdminRoleAssignment.IUpdate;

  const revoked: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.update(
      connection,
      {
        adminRoleAssignmentId: olderAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(revoked);

  // 5. Search with created_at window covering both assignments and include_deleted=true
  const from =
    assignment1.created_at <= assignment2.created_at
      ? assignment1.created_at
      : assignment2.created_at;
  const to =
    assignment1.created_at >= assignment2.created_at
      ? assignment1.created_at
      : assignment2.created_at;

  const searchRequestWithDeleted = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: authorized.id,
    role_code: role.code,
    granted_by_admin_id: authorized.id,
    created_from: from,
    created_to: to,
    include_deleted: true,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const pageWithDeleted: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoleAssignments.index(
      connection,
      { body: searchRequestWithDeleted },
    );
  typia.assert(pageWithDeleted);

  const idsWithDeleted = pageWithDeleted.data.map((s) => s.id);
  TestValidator.predicate(
    "include_deleted search should contain first assignment",
    idsWithDeleted.includes(assignment1.id),
  );
  TestValidator.predicate(
    "include_deleted search should contain second assignment",
    idsWithDeleted.includes(assignment2.id),
  );

  // find corresponding summaries for our assignments
  const summary1 = pageWithDeleted.data.find((s) => s.id === assignment1.id);
  const summary2 = pageWithDeleted.data.find((s) => s.id === assignment2.id);
  typia.assertGuard(summary1!);
  typia.assertGuard(summary2!);

  const revokedSummary = revoked.id === summary1.id ? summary1 : summary2;
  const activeSummary = revoked.id === summary1.id ? summary2 : summary1;

  TestValidator.predicate(
    "revoked assignment should have non-null deleted_at when include_deleted is true",
    revokedSummary.deleted_at !== null &&
      revokedSummary.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "active assignment should have null or undefined deleted_at when include_deleted is true",
    activeSummary.deleted_at === null || activeSummary.deleted_at === undefined,
  );

  // verify that among our two assignments, the newer one appears first when sorted by created_at desc
  const ourSummariesSorted = pageWithDeleted.data
    .filter((s) => s.id === assignment1.id || s.id === assignment2.id)
    .sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
    );

  if (ourSummariesSorted.length >= 2) {
    TestValidator.equals(
      "newer assignment should appear first among our test assignments when sorted by created_at desc (include_deleted=true)",
      ourSummariesSorted[0].id,
      newerAssignment.id,
    );
  }

  // 6. Search again without include_deleted (defaults to false) -> only active assignment should appear
  const searchRequestActiveOnly = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    admin_id: authorized.id,
    role_code: role.code,
    granted_by_admin_id: authorized.id,
    created_from: from,
    created_to: to,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const pageActiveOnly: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoleAssignments.index(
      connection,
      { body: searchRequestActiveOnly },
    );
  typia.assert(pageActiveOnly);

  const idsActiveOnly = pageActiveOnly.data.map((s) => s.id);
  TestValidator.predicate(
    "active-only search should contain active assignment",
    idsActiveOnly.includes(activeSummary.id),
  );
  TestValidator.predicate(
    "active-only search should not contain revoked assignment",
    !idsActiveOnly.includes(revokedSummary.id),
  );

  // verify sort ordering among our assignments in active-only search as well
  const ourActiveSummariesSorted = pageActiveOnly.data
    .filter((s) => s.id === assignment1.id || s.id === assignment2.id)
    .sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
    );

  if (ourActiveSummariesSorted.length >= 1) {
    TestValidator.equals(
      "newer active assignment should appear first among our test assignments when include_deleted is omitted",
      ourActiveSummariesSorted[0].id,
      newerAssignment.id,
    );
  }
}
