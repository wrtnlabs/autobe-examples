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

export async function test_api_admin_role_assignments_index_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // Use the embedded admin summary id when available, otherwise fallback to top-level id
  const targetAdminId = (authorizedAdmin.admin?.id ??
    authorizedAdmin.id) as string & tags.Format<"uuid">;

  // 2. Create a new admin role
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    {
      body: roleBody,
    },
  );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // 3. Create at least one admin role assignment for this role
  const assignmentBody = {
    admin_id: targetAdminId,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const createdAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: createdRole.code,
        body: assignmentBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(createdAssignment);

  // 4. Call index endpoint with basic pagination parameters
  const requestBody = {
    page: 0,
    limit: 10,
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const pageResult =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode: createdRole.code,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 5. Basic pagination assertions
  TestValidator.equals(
    "pagination current page should be 0",
    pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    requestBody.limit,
  );

  TestValidator.predicate(
    "data should contain at least one assignment",
    pageResult.data.length >= 1,
  );

  // 6. Validate each returned summary
  for (const summary of pageResult.data) {
    typia.assert<IShoppingMallAdminRoleAssignment.ISummary>(summary);

    TestValidator.equals(
      "each assignment's role.code should match created role code",
      summary.role.code,
      createdRole.code,
    );

    // Verify logically deleted assignments are not included when include_deleted is not set
    TestValidator.predicate(
      "deleted_at should be null when include_deleted is not set",
      summary.deleted_at === null || summary.deleted_at === undefined,
    );
  }
}
