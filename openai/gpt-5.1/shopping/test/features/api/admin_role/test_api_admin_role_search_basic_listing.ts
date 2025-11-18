import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate basic admin role listing with default pagination.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated admin can list administrative roles using the
 *   PATCH /shoppingMall/admin/adminRoles search endpoint with basic pagination
 *   parameters.
 * - Verify that newly created roles appear in the paginated result as
 *   IShoppingMallAdminRole.ISummary items and that the summary fields are
 *   correctly mapped from the created entities.
 * - Confirm that the endpoint returns coherent pagination metadata
 *   (IPage.IPagination) and does not expose extra fields beyond the ISummary
 *   contract.
 *
 * Flow:
 *
 * 1. Register an admin (POST /auth/admin/join) so that the connection is
 *    authenticated as an admin actor.
 * 2. Create two distinct admin roles with different codes, names and is_system
 *    flags via POST /shoppingMall/admin/adminRoles.
 * 3. Call PATCH /shoppingMall/admin/adminRoles with page=1 and limit=20 while
 *    leaving other filters undefined to exercise default search behavior.
 * 4. Assert pagination metadata and confirm that both created roles appear in the
 *    returned summaries with matching code, name, isSystem, and a populated
 *    createdAt.
 * 5. Rely on typia.assert to guarantee that no additional fields beyond
 *    IShoppingMallAdminRole.ISummary are present in the summaries, thereby
 *    ensuring no sensitive information is leaked.
 */
export async function test_api_admin_role_search_basic_listing(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two distinct admin roles with different is_system flags
  const roleCreateBody1 = {
    code: `e2e_role_1_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole1: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody1,
    });
  typia.assert(createdRole1);

  const roleCreateBody2 = {
    code: `e2e_role_2_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_system: true,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole2: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody2,
    });
  typia.assert(createdRole2);

  // 3. Call listing endpoint with basic pagination
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminRole.IRequest;

  const pageResult: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 4. Validate pagination metadata
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page should match request",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when records exist",
    pagination.records === 0 || pagination.pages >= 1,
  );

  // 5. Confirm that both created roles appear in the listing
  const summaries = pageResult.data;

  const summary1 = summaries.find((s) => s.code === createdRole1.code);
  TestValidator.predicate(
    "listing should contain summary for first created role",
    summary1 !== undefined,
  );

  const summary2 = summaries.find((s) => s.code === createdRole2.code);
  TestValidator.predicate(
    "listing should contain summary for second created role",
    summary2 !== undefined,
  );

  if (summary1 !== undefined) {
    TestValidator.equals(
      "first role summary code should match created role",
      summary1.code,
      createdRole1.code,
    );
    TestValidator.equals(
      "first role summary name should match created role",
      summary1.name,
      createdRole1.name,
    );
    TestValidator.equals(
      "first role summary isSystem should map from is_system",
      summary1.isSystem,
      createdRole1.is_system,
    );
    TestValidator.predicate(
      "first role summary should have non-empty id",
      !!summary1.id,
    );
    TestValidator.predicate(
      "first role summary should have non-empty createdAt",
      !!summary1.createdAt,
    );
  }

  if (summary2 !== undefined) {
    TestValidator.equals(
      "second role summary code should match created role",
      summary2.code,
      createdRole2.code,
    );
    TestValidator.equals(
      "second role summary name should match created role",
      summary2.name,
      createdRole2.name,
    );
    TestValidator.equals(
      "second role summary isSystem should map from is_system",
      summary2.isSystem,
      createdRole2.is_system,
    );
    TestValidator.predicate(
      "second role summary should have non-empty id",
      !!summary2.id,
    );
    TestValidator.predicate(
      "second role summary should have non-empty createdAt",
      !!summary2.createdAt,
    );
  }
}
