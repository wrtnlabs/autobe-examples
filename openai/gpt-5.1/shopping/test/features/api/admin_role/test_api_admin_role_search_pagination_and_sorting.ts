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
 * Validate pagination and sorting of admin role search endpoint.
 *
 * Business goal: Ensure that PATCH /shoppingMall/admin/adminRoles correctly
 * supports server-side pagination and lexicographical sorting by role code so
 * that admin consoles can reliably navigate large role catalogs.
 *
 * Scenario steps:
 *
 * 1. Join an admin via POST /auth/admin/join to get an authenticated session.
 * 2. Create a sufficiently large number of admin roles (>= 25) via POST
 *    /shoppingMall/admin/adminRoles with unique codes/names so that at least 3
 *    pages exist when using limit=10.
 * 3. Search roles with page=1, limit=10, order_by="code", order_direction="asc"
 *    using PATCH /shoppingMall/admin/adminRoles and validate:
 *
 *    - Pagination.current is 1
 *    - Pagination.limit is 10
 *    - Data.length is <= 10
 *    - Codes in data are sorted ascending lexicographically
 * 4. Search roles with page=2, same limit and ordering, and validate:
 *
 *    - Pagination.current is 2
 *    - Data.length is <= 10
 *    - No role id overlap with page 1
 *    - Pagination.records is at least the number of roles created in this test and
 *         pagination.pages is consistent with records and limit.
 * 5. Optionally search with order_direction="desc" to confirm reverse code
 *    ordering on first page.
 */
export async function test_api_admin_role_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a batch of admin roles (e.g., 25) with unique codes and names
  const totalToCreate = 25;
  const createdRoles: IShoppingMallAdminRole[] = [];

  for (let i = 0; i < totalToCreate; i++) {
    const indexStr = i.toString().padStart(3, "0");
    const code = `role_${indexStr}_${RandomGenerator.alphaNumeric(4)}`;
    const name = `Role Name ${indexStr}`;

    const createBody = {
      code,
      name,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_system: false,
    } satisfies IShoppingMallAdminRole.ICreate;

    const role: IShoppingMallAdminRole =
      await api.functional.shoppingMall.admin.adminRoles.create(connection, {
        body: createBody,
      });
    typia.assert(role);
    createdRoles.push(role);
  }

  // 3. Query page 1 with ascending code ordering
  const page1Request = {
    page: 1,
    limit: 10,
    order_by: "code",
    order_direction: "asc",
  } satisfies IShoppingMallAdminRole.IRequest;

  const page1: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: page1Request,
    });
  typia.assert(page1);

  // Basic pagination validations for page 1
  TestValidator.equals(
    "page 1: pagination.current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1: pagination.limit should be 10",
    page1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1: data length should be <= limit",
    page1.data.length <= page1.pagination.limit,
  );

  // Validate that codes are sorted ascending in page1.data
  const page1Codes = page1.data.map((r) => r.code);
  const page1CodesSortedAsc = [...page1Codes].sort((a, b) =>
    a.localeCompare(b),
  );
  TestValidator.equals(
    "page 1: role codes should be in ascending order",
    page1Codes,
    page1CodesSortedAsc,
  );

  // 4. Query page 2 with the same ordering
  const page2Request = {
    page: 2,
    limit: 10,
    order_by: "code",
    order_direction: "asc",
  } satisfies IShoppingMallAdminRole.IRequest;

  const page2: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: page2Request,
    });
  typia.assert(page2);

  TestValidator.equals(
    "page 2: pagination.current should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2: pagination.limit should be 10",
    page2.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 2: data length should be <= limit",
    page2.data.length <= page2.pagination.limit,
  );

  // Ensure no overlap between page 1 and page 2 role ids
  const page1Ids = new Set(page1.data.map((r) => r.id));
  const page2Ids = new Set(page2.data.map((r) => r.id));
  const hasOverlap = Array.from(page2Ids).some((id) => page1Ids.has(id));
  TestValidator.predicate(
    "page 1 and page 2 should not share role ids",
    hasOverlap === false,
  );

  // 4-b. Validate pagination.records and pages consistency
  const totalRecords = page1.pagination.records;
  const limit = page1.pagination.limit;
  const expectedPages = limit === 0 ? 0 : Math.ceil(totalRecords / limit);

  TestValidator.equals(
    "pagination.pages should be consistent with records and limit",
    page1.pagination.pages,
    expectedPages,
  );

  // Ensure that totalRecords is at least the number of roles created in this test
  TestValidator.predicate(
    "total records should be >= number of roles created in this test",
    totalRecords >= createdRoles.length,
  );

  // 5. Optional: verify descending order on first page
  const page1DescRequest = {
    page: 1,
    limit: 10,
    order_by: "code",
    order_direction: "desc",
  } satisfies IShoppingMallAdminRole.IRequest;

  const page1Desc: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: page1DescRequest,
    });
  typia.assert(page1Desc);

  const page1DescCodes = page1Desc.data.map((r) => r.code);
  const page1CodesSortedDesc = [...page1DescCodes].sort((a, b) =>
    b.localeCompare(a),
  );
  TestValidator.equals(
    "page 1 desc: role codes should be in descending order",
    page1DescCodes,
    page1CodesSortedDesc,
  );
}
