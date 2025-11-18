import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHold";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate legal hold search pagination and sorting for admin users.
 *
 * This test ensures that an authenticated shopping mall administrator can:
 *
 * 1. Seed multiple legal hold records via POST /shoppingMall/admin/legalHolds.
 * 2. Search those records using PATCH /shoppingMall/admin/legalHolds with
 *    IShoppingMallLegalHold.IRequest pagination and sorting parameters.
 * 3. Receive correctly paginated data and ordering for both DESC and ASC
 *    created_at sorting.
 *
 * High-level flow:
 *
 * 1. Register an admin via POST /auth/admin/join, which also authenticates the
 *    connection for subsequent calls.
 * 2. Create more than two pages of legal holds (e.g., 12 holds for a page size of
 *    5) with unique codes and titles, capturing their created_at values from
 *    responses.
 * 3. Build an in-memory baseline ordering of the created holds by created_at both
 *    descending and ascending.
 * 4. Call PATCH /shoppingMall/admin/legalHolds with page=1, limit=5,
 *    order_by="created_at", order_direction="desc" and assert that:
 *
 *    - Pagination.current and pagination.limit match expectations.
 *    - Returned data length is <= limit.
 *    - The IDs of the returned holds match the first page slice of the baseline DESC
 *         ordering.
 * 5. Call PATCH again with page=2 (same limit and ordering) and assert that:
 *
 *    - Pagination.current = 2.
 *    - IDs correspond to the second page of the baseline DESC ordering.
 *    - There is no overlap of IDs between page 1 and page 2, and together they
 *         represent the first 2 * limit records in the DESC baseline.
 * 6. Repeat the above pagination checks for ASC ordering and verify that returned
 *    IDs follow the ascending baseline ordering for pages 1 and 2.
 */
export async function test_api_legal_hold_search_pagination_and_sorting_behavior(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Seed multiple legal holds to exceed one page
  const pageSize = 5;
  const totalCount = 12; // > 2 * pageSize to validate two pages

  const createdHolds: IShoppingMallLegalHold[] = [];

  for (let i = 0; i < totalCount; ++i) {
    const body = {
      code: `LH-${i}-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
      status: "active",
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: RandomGenerator.alphaNumeric(10),
      effective_from: null,
    } satisfies IShoppingMallLegalHold.ICreate;

    const created = await api.functional.shoppingMall.admin.legalHolds.create(
      connection,
      {
        body,
      },
    );
    typia.assert<IShoppingMallLegalHold>(created);
    createdHolds.push(created);
  }

  // 3. Build baseline ordering by created_at
  const sortedDesc: IShoppingMallLegalHold[] = [...createdHolds].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const sortedAsc: IShoppingMallLegalHold[] = [...createdHolds].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Helper to extract IDs from summary list
  const extractIds = (list: IShoppingMallLegalHold.ISummary[]): string[] =>
    list.map((s) => s.id);

  // 4. Page 1 DESC
  const requestDescPage1 = {
    page: 1,
    limit: pageSize,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallLegalHold.IRequest;

  const page1Desc = await api.functional.shoppingMall.admin.legalHolds.index(
    connection,
    {
      body: requestDescPage1,
    },
  );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(page1Desc);

  TestValidator.equals(
    "DESC page 1 current page",
    page1Desc.pagination.current,
    1,
  );
  TestValidator.equals(
    "DESC page 1 limit",
    page1Desc.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "DESC page 1 length <= limit",
    page1Desc.data.length <= pageSize,
  );

  const expectedPage1Desc = sortedDesc.slice(0, pageSize);
  const expectedIdsPage1Desc = expectedPage1Desc.map((h) => h.id);
  const actualIdsPage1Desc = extractIds(page1Desc.data);

  TestValidator.equals(
    "DESC page 1 IDs match baseline",
    actualIdsPage1Desc,
    expectedIdsPage1Desc,
  );

  // 5. Page 2 DESC
  const requestDescPage2 = {
    page: 2,
    limit: pageSize,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallLegalHold.IRequest;

  const page2Desc = await api.functional.shoppingMall.admin.legalHolds.index(
    connection,
    {
      body: requestDescPage2,
    },
  );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(page2Desc);

  TestValidator.equals(
    "DESC page 2 current page",
    page2Desc.pagination.current,
    2,
  );
  TestValidator.equals(
    "DESC page 2 limit",
    page2Desc.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "DESC page 2 length <= limit",
    page2Desc.data.length <= pageSize,
  );

  const expectedPage2Desc = sortedDesc.slice(pageSize, 2 * pageSize);
  const expectedIdsPage2Desc = expectedPage2Desc.map((h) => h.id);
  const actualIdsPage2Desc = extractIds(page2Desc.data);

  TestValidator.equals(
    "DESC page 2 IDs match baseline",
    actualIdsPage2Desc,
    expectedIdsPage2Desc,
  );

  // Ensure pages 1 and 2 do not overlap and together form first 2*pageSize IDs
  const allFirstTwoPagesDescIds = [
    ...actualIdsPage1Desc,
    ...actualIdsPage2Desc,
  ];
  const setIds = new Set(allFirstTwoPagesDescIds);
  TestValidator.equals(
    "DESC first 2 pages have unique IDs",
    allFirstTwoPagesDescIds.length,
    setIds.size,
  );

  const expectedFirstTwoPagesIdsDesc = sortedDesc
    .slice(0, 2 * pageSize)
    .map((h) => h.id);
  TestValidator.equals(
    "DESC first 2 pages IDs equal baseline slice",
    allFirstTwoPagesDescIds,
    expectedFirstTwoPagesIdsDesc,
  );

  // 6. Page 1 ASC
  const requestAscPage1 = {
    page: 1,
    limit: pageSize,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallLegalHold.IRequest;

  const page1Asc = await api.functional.shoppingMall.admin.legalHolds.index(
    connection,
    {
      body: requestAscPage1,
    },
  );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(page1Asc);

  TestValidator.equals(
    "ASC page 1 current page",
    page1Asc.pagination.current,
    1,
  );
  TestValidator.equals("ASC page 1 limit", page1Asc.pagination.limit, pageSize);
  TestValidator.predicate(
    "ASC page 1 length <= limit",
    page1Asc.data.length <= pageSize,
  );

  const expectedPage1Asc = sortedAsc.slice(0, pageSize);
  const expectedIdsPage1Asc = expectedPage1Asc.map((h) => h.id);
  const actualIdsPage1Asc = extractIds(page1Asc.data);

  TestValidator.equals(
    "ASC page 1 IDs match baseline",
    actualIdsPage1Asc,
    expectedIdsPage1Asc,
  );

  // 7. Page 2 ASC
  const requestAscPage2 = {
    page: 2,
    limit: pageSize,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallLegalHold.IRequest;

  const page2Asc = await api.functional.shoppingMall.admin.legalHolds.index(
    connection,
    {
      body: requestAscPage2,
    },
  );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(page2Asc);

  TestValidator.equals(
    "ASC page 2 current page",
    page2Asc.pagination.current,
    2,
  );
  TestValidator.equals("ASC page 2 limit", page2Asc.pagination.limit, pageSize);
  TestValidator.predicate(
    "ASC page 2 length <= limit",
    page2Asc.data.length <= pageSize,
  );

  const expectedPage2Asc = sortedAsc.slice(pageSize, 2 * pageSize);
  const expectedIdsPage2Asc = expectedPage2Asc.map((h) => h.id);
  const actualIdsPage2Asc = extractIds(page2Asc.data);

  TestValidator.equals(
    "ASC page 2 IDs match baseline",
    actualIdsPage2Asc,
    expectedIdsPage2Asc,
  );

  const allFirstTwoPagesAscIds = [...actualIdsPage1Asc, ...actualIdsPage2Asc];
  const ascSetIds = new Set(allFirstTwoPagesAscIds);
  TestValidator.equals(
    "ASC first 2 pages have unique IDs",
    allFirstTwoPagesAscIds.length,
    ascSetIds.size,
  );

  const expectedFirstTwoPagesIdsAsc = sortedAsc
    .slice(0, 2 * pageSize)
    .map((h) => h.id);
  TestValidator.equals(
    "ASC first 2 pages IDs equal baseline slice",
    allFirstTwoPagesAscIds,
    expectedFirstTwoPagesIdsAsc,
  );
}
