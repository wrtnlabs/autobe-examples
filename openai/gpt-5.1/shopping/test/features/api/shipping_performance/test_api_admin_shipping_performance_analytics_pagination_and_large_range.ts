import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingPerformanceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPerformanceAnalytics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallShippingPerformanceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceAnalytics";

export async function test_api_admin_shipping_performance_analytics_pagination_and_large_range(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Build 90-day range request for page 1
  const now = new Date();
  const fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const requestPage1 = {
    from: fromDate.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
    granularity: "day",
    groupBy: ["shippingMethod"],
    sellerId: null,
    countryCode: null,
    regionCode: null,
    shippingMethodCode: null,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

  const page1: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
      connection,
      {
        body: requestPage1,
      },
    );
  typia.assert<IPageIShoppingMallShippingPerformanceAnalytics.ISummary>(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  const data1 = page1.data;

  // Basic pagination assertions for page 1
  TestValidator.equals(
    "page 1: current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals("page 1: limit should be 10", pagination1.limit, 10);
  TestValidator.predicate(
    "page 1: records should be >= data length",
    pagination1.records >= data1.length,
  );
  TestValidator.predicate(
    "page 1: pages should be >= 1",
    pagination1.pages >= 1,
  );

  const pages = pagination1.pages;

  // If multiple pages exist, fetch page 2 and compare
  if (pages > 1) {
    const requestPage2 = {
      ...requestPage1,
      page: 2,
    } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

    const page2: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
      await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
        connection,
        {
          body: requestPage2,
        },
      );
    typia.assert<IPageIShoppingMallShippingPerformanceAnalytics.ISummary>(
      page2,
    );

    const pagination2: IPage.IPagination = page2.pagination;
    const data2 = page2.data;

    TestValidator.equals(
      "page 2: current page should be 2",
      pagination2.current,
      2,
    );
    TestValidator.equals("page 2: limit should be 10", pagination2.limit, 10);
    TestValidator.predicate(
      "page 2: data length should be <= limit",
      data2.length <= pagination2.limit,
    );

    // If both pages contain data, ensure no overlapping ids
    if (data1.length > 0 && data2.length > 0) {
      const idsPage1 = new Set<string>();
      for (const row of data1) idsPage1.add(row.id);

      const hasOverlap = data2.some((row) => idsPage1.has(row.id));

      TestValidator.predicate(
        "pages 1 and 2: no overlapping analytics row ids",
        hasOverlap === false,
      );
    }

    // Optionally test last page behaviour when there are more pages
    if (pages >= 2) {
      const requestLast = {
        ...requestPage1,
        page: pages,
      } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

      const lastPage: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
        await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
          connection,
          {
            body: requestLast,
          },
        );
      typia.assert<IPageIShoppingMallShippingPerformanceAnalytics.ISummary>(
        lastPage,
      );

      const paginationLast: IPage.IPagination = lastPage.pagination;
      const dataLast = lastPage.data;

      TestValidator.equals(
        "last page: current should equal pages",
        paginationLast.current,
        pages,
      );
      TestValidator.equals(
        "last page: limit should be 10",
        paginationLast.limit,
        10,
      );
      TestValidator.predicate(
        "last page: data length should be <= limit",
        dataLast.length <= paginationLast.limit,
      );

      // If we have data across pages 1, 2, and last, ensure unique id count
      if (data1.length > 0 && data2.length > 0 && dataLast.length > 0) {
        const uniqueIds = new Set<string>();
        for (const row of data1) uniqueIds.add(row.id);
        for (const row of data2) uniqueIds.add(row.id);
        for (const row of dataLast) uniqueIds.add(row.id);

        TestValidator.predicate(
          "unique analytics rows count across sampled pages should not exceed total records",
          uniqueIds.size <= pagination1.records,
        );
      }
    }
  }
}
