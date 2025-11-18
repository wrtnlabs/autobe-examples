import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPermission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate consistent sorting and pagination behavior for admin permission
 * search.
 *
 * Business context: Admin consoles allow operators to browse a catalog of
 * fine-grained permissions stored in shopping_mall_admin_permissions. The PATCH
 * /shoppingMall/admin/adminPermissions endpoint supports rich filtering,
 * sorting, and pagination via IShoppingMallAdminPermission.IRequest. This test
 * ensures that when an admin orders by a chosen field (code or created_at) in
 * ascending or descending order, pagination slices are stable and consistent
 * across pages.
 *
 * Scenario:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context. The SDK join() call automatically sets the Authorization
 *    header on the connection.
 * 2. Seed at least five deterministic admin permissions via POST
 *    /shoppingMall/admin/adminPermissions by calling
 *    api.functional.shoppingMall.admin.adminPermissions.create() multiple
 *    times. Codes will be simple sortable literals like "code-A" .. "code-E" so
 *    that lexicographical ordering is predictable. Names and categories can be
 *    varied but do not affect core assertions.
 * 3. Call PATCH /shoppingMall/admin/adminPermissions with an
 *    IShoppingMallAdminPermission.IRequest body specifying:
 *
 *    - Page: 1
 *    - Limit: 2
 *    - Order_by: "code"
 *    - Order_direction: "asc" Capture the IPageIShoppingMallAdminPermission.ISummary
 *         response.
 * 4. Assert via typia.assert() that the response is structurally valid and via
 *    TestValidator that:
 *
 *    - Pagination.limit === 2
 *    - Pagination.current === 1
 *    - Data length is 2
 *    - The codes are the first two when all seeded permissions are sorted by code
 *         ascending.
 * 5. Call the same endpoint with page: 2, limit: 2 and order_by: "code",
 *    order_direction: "asc". Validate that:
 *
 *    - Pagination.current === 2
 *    - Data length is 2
 *    - The codes correspond to the 3rd and 4th items of the same asc-sorted list.
 * 6. Repeat steps 3‑5 with order_direction: "desc" and verify that the slice of
 *    codes is reversed while pagination metadata (limit, pages, records) is
 *    consistent with the previous asc queries.
 * 7. Optionally, perform an additional query ordering by "created_at" ascending
 *    with a sufficiently large limit (e.g., limit = seeded count) and verify
 *    that the returned order matches the insertion order of the created
 *    permissions.
 */
export async function test_api_admin_permission_search_sorting_and_pagination_consistency(
  connection: api.IConnection,
) {
  // 1. Join an admin to establish authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // any string is acceptable; Format<"password"> is not validated here
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed deterministic permissions
  const baseCodes = ["code-A", "code-B", "code-C", "code-D", "code-E"] as const;

  const createdPermissions: IShoppingMallAdminPermission[] = [];
  for (let i = 0; i < baseCodes.length; i++) {
    const createBody = {
      code: baseCodes[i],
      name: `Permission ${baseCodes[i]}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      category: i % 2 === 0 ? "category-odd" : "category-even",
      is_system: i % 2 === 0,
    } satisfies IShoppingMallAdminPermission.ICreate;

    const created =
      await api.functional.shoppingMall.admin.adminPermissions.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    createdPermissions.push(created);
  }

  // Helper: sort the seeded permissions by code asc/desc for expectations
  const sortedByCodeAsc = [...createdPermissions].sort((a, b) =>
    a.code.localeCompare(b.code),
  );
  const sortedByCodeDesc = [...sortedByCodeAsc].slice().reverse();

  // sanity: we expect at least 5 permissions
  TestValidator.predicate(
    "seeded at least 5 permissions",
    sortedByCodeAsc.length >= 5,
  );

  // 3. Query page 1, limit 2, order_by=code, asc
  const page1Asc: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        order_by: "code",
        order_direction: "asc",
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert(page1Asc);

  TestValidator.equals(
    "page1 asc pagination.current is 1",
    page1Asc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 asc pagination.limit is 2",
    page1Asc.pagination.limit,
    2,
  );
  TestValidator.equals("page1 asc data length is 2", page1Asc.data.length, 2);

  const expectedPage1AscCodes = sortedByCodeAsc.slice(0, 2).map((p) => p.code);
  const actualPage1AscCodes = page1Asc.data.map((p) => p.code);
  TestValidator.equals(
    "page1 asc codes match first two asc-sorted codes",
    actualPage1AscCodes,
    expectedPage1AscCodes,
  );

  // 4. Query page 2, limit 2, order_by=code, asc
  const page2Asc: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        order_by: "code",
        order_direction: "asc",
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert(page2Asc);

  TestValidator.equals(
    "page2 asc pagination.current is 2",
    page2Asc.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 asc pagination.limit is 2",
    page2Asc.pagination.limit,
    2,
  );
  TestValidator.equals("page2 asc data length is 2", page2Asc.data.length, 2);

  const expectedPage2AscCodes = sortedByCodeAsc.slice(2, 4).map((p) => p.code);
  const actualPage2AscCodes = page2Asc.data.map((p) => p.code);
  TestValidator.equals(
    "page2 asc codes match third and fourth asc-sorted codes",
    actualPage2AscCodes,
    expectedPage2AscCodes,
  );

  // 5. Query page 1, limit 2, order_by=code, desc
  const page1Desc: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        order_by: "code",
        order_direction: "desc",
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert(page1Desc);

  TestValidator.equals(
    "page1 desc pagination.current is 1",
    page1Desc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 desc pagination.limit is 2",
    page1Desc.pagination.limit,
    2,
  );
  TestValidator.equals("page1 desc data length is 2", page1Desc.data.length, 2);

  const expectedPage1DescCodes = sortedByCodeDesc
    .slice(0, 2)
    .map((p) => p.code);
  const actualPage1DescCodes = page1Desc.data.map((p) => p.code);
  TestValidator.equals(
    "page1 desc codes match first two desc-sorted codes",
    actualPage1DescCodes,
    expectedPage1DescCodes,
  );

  // 6. Query page 2, limit 2, order_by=code, desc
  const page2Desc: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        order_by: "code",
        order_direction: "desc",
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert(page2Desc);

  TestValidator.equals(
    "page2 desc pagination.current is 2",
    page2Desc.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 desc pagination.limit is 2",
    page2Desc.pagination.limit,
    2,
  );
  TestValidator.equals("page2 desc data length is 2", page2Desc.data.length, 2);

  const expectedPage2DescCodes = sortedByCodeDesc
    .slice(2, 4)
    .map((p) => p.code);
  const actualPage2DescCodes = page2Desc.data.map((p) => p.code);
  TestValidator.equals(
    "page2 desc codes match third and fourth desc-sorted codes",
    actualPage2DescCodes,
    expectedPage2DescCodes,
  );

  // 7. Optional: verify created_at ordering aligned with insertion order.
  // Use a large limit to fetch at least all newly created permissions when
  // ordering by created_at asc. Rely on the assumption that newly created
  // permissions appear at the end of the created_at asc list.
  const createdAtAscPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies IShoppingMallAdminPermission.IRequest,
    });
  typia.assert(createdAtAscPage);

  // Filter down to only permissions whose IDs are in our createdPermissions set
  const createdIds = new Set(createdPermissions.map((p) => p.id));
  const filteredByCreatedAt = createdAtAscPage.data.filter((p) =>
    createdIds.has(p.id),
  );

  // When ordered by created_at asc, the subset corresponding to our newly
  // created permissions should appear in the same order as they were inserted.
  const expectedInsertionOrderIds = createdPermissions.map((p) => p.id);
  const actualCreatedAtOrderedIds = filteredByCreatedAt.map((p) => p.id);

  TestValidator.equals(
    "created_at asc ordering for seeded permissions matches insertion order",
    actualCreatedAtOrderedIds,
    expectedInsertionOrderIds,
  );
}
