import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

/**
 * Validate KPI pagination and sorting for admin platform analytics.
 *
 * Business purpose: This test ensures that the admin-facing platform KPI
 * analytics endpoint `/shoppingMall/admin/analytics/platformKpis` correctly
 * handles pagination and sorting semantics when an administrator searches KPI
 * snapshots over a broad time window. It verifies that pagination metadata is
 * consistent across pages, that snapshot IDs do not duplicate between
 * consecutive pages under the same filter/sort conditions, and that the
 * `period_start` field is ordered in strict descending order within and across
 * pages when requested.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join, which also authenticates the
 *    connection by setting Authorization header automatically.
 * 2. Perform a KPI search (page 1, limit 10, orderBy=period_start,
 *    orderDirection=desc) over a wide period window.
 * 3. Perform a second KPI search (page 2) with the same filters and sort.
 * 4. Validate pagination metadata consistency and that total record counts are
 *    compatible with the sum of records from page 1 and 2.
 * 5. Ensure no snapshot ID appears in both page 1 and 2.
 * 6. Validate that each page is internally sorted by period_start in descending
 *    order.
 * 7. When both pages have data, ensure that the first record of page 1 is not
 *    older than the first record of page 2 (consistent with global descending
 *    order).
 * 8. Optionally, request the last page and ensure it has at most `limit` records
 *    and is correctly labeled as the last page.
 */
export async function test_api_admin_platform_kpi_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin account
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a broad KPI search request for page 1
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const baseRequest = {
    periodStartFrom: oneYearAgo.toISOString(),
    periodStartTo: now.toISOString(),
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: "period_start",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const page1: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot>(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  const data1: IShoppingMallPlatformKpiSnapshot[] = page1.data;

  // Basic assertions on page 1 pagination
  TestValidator.equals(
    "page 1 current page index should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals("page 1 limit should be 10", pagination1.limit, 10);

  // If there is only one or zero pages, we can still validate sorting on page 1
  const hasMultiplePages = pagination1.pages >= 2;

  // Validate sorting within page 1 (period_start descending)
  for (let i = 1; i < data1.length; i++) {
    const prev = data1[i - 1].period_start;
    const curr = data1[i].period_start;
    TestValidator.predicate(
      `page 1 period_start must be descending at index ${i}`,
      prev >= curr,
    );
  }

  if (!hasMultiplePages) {
    // If only one page exists, we cannot meaningfully test cross-page
    // pagination and distinctness. End after internal sorting checks.
    return;
  }

  // 3. Request page 2 with the same filters and sorting
  const page2Request: IShoppingMallPlatformKpiSnapshot.IRequest = {
    ...baseRequest,
    page: 2 as number & tags.Type<"int32">,
  };

  const page2: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      {
        body: page2Request,
      },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot>(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  const data2: IShoppingMallPlatformKpiSnapshot[] = page2.data;

  // 4. Pagination metadata consistency between page 1 and 2
  TestValidator.equals(
    "page 2 current page index should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals("page 2 limit should be 10", pagination2.limit, 10);

  TestValidator.equals(
    "records count should be consistent between page 1 and 2",
    pagination1.records,
    pagination2.records,
  );

  TestValidator.equals(
    "total pages should be consistent between page 1 and 2",
    pagination1.pages,
    pagination2.pages,
  );

  const combinedCount = data1.length + data2.length;
  TestValidator.predicate(
    "records should be at least as many as the sum of first two pages",
    pagination1.records >= combinedCount,
  );

  // Page sizes should not exceed the limit
  TestValidator.predicate(
    "page 1 data length must be <= limit",
    data1.length <= pagination1.limit,
  );
  TestValidator.predicate(
    "page 2 data length must be <= limit",
    data2.length <= pagination2.limit,
  );

  // 5. Distinct snapshot IDs across page 1 and 2
  const ids1 = data1.map((s) => s.id);
  const ids2 = data2.map((s) => s.id);
  const combinedIds = [...ids1, ...ids2];
  const uniqueIds = new Set(combinedIds);

  TestValidator.equals(
    "combined page 1 and 2 should not contain duplicate snapshot IDs",
    uniqueIds.size,
    combinedIds.length,
  );

  // 6. Sorting validation within page 2
  for (let i = 1; i < data2.length; i++) {
    const prev = data2[i - 1].period_start;
    const curr = data2[i].period_start;
    TestValidator.predicate(
      `page 2 period_start must be descending at index ${i}`,
      prev >= curr,
    );
  }

  // 7. Cross-page ordering check between page 1 and page 2
  if (data1.length > 0 && data2.length > 0) {
    const first1 = data1[0].period_start;
    const first2 = data2[0].period_start;
    TestValidator.predicate(
      "first record on page 1 should not be older than first record on page 2",
      first1 >= first2,
    );
  }

  // 8. Optional last-page check when there are more than 2 pages
  if (pagination1.pages > 2) {
    const lastPageIndex = pagination1.pages;

    const lastRequest: IShoppingMallPlatformKpiSnapshot.IRequest = {
      ...baseRequest,
      page: lastPageIndex as number & tags.Type<"int32">,
    };

    const lastPage: IPageIShoppingMallPlatformKpiSnapshot =
      await api.functional.shoppingMall.admin.analytics.platformKpis.index(
        connection,
        {
          body: lastRequest,
        },
      );
    typia.assert<IPageIShoppingMallPlatformKpiSnapshot>(lastPage);

    const paginationLast: IPage.IPagination = lastPage.pagination;
    const dataLast: IShoppingMallPlatformKpiSnapshot[] = lastPage.data;

    TestValidator.equals(
      "last page current index should equal total pages",
      paginationLast.current,
      lastPageIndex,
    );

    TestValidator.predicate(
      "last page data length must be <= limit",
      dataLast.length <= paginationLast.limit,
    );

    for (let i = 1; i < dataLast.length; i++) {
      const prev = dataLast[i - 1].period_start;
      const curr = dataLast[i].period_start;
      TestValidator.predicate(
        `last page period_start must be descending at index ${i}`,
        prev >= curr,
      );
    }
  }
}
