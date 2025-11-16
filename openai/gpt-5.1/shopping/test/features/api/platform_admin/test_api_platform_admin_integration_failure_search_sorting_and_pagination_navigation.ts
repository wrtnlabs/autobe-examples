import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_integration_failure_search_sorting_and_pagination_navigation(
  connection: api.IConnection,
) {
  // Helper: build comparator for a given sort key and order.
  // Returns null when we cannot reliably derive ordering from DTO fields.
  const buildComparator = (
    sortBy:
      | "occurred_at"
      | "severity"
      | "integration_type"
      | "partner_identifier",
    sortOrder: "asc" | "desc",
  ):
    | ((
        a: IShoppingMallLoggingIntegrationFailure.ISummary,
        b: IShoppingMallLoggingIntegrationFailure.ISummary,
      ) => number)
    | null => {
    const direction = sortOrder === "asc" ? 1 : -1;

    if (sortBy === "occurred_at") {
      return (
        a: IShoppingMallLoggingIntegrationFailure.ISummary,
        b: IShoppingMallLoggingIntegrationFailure.ISummary,
      ): number => {
        const av = Date.parse(a.occurred_at);
        const bv = Date.parse(b.occurred_at);
        if (av === bv) return 0;
        return av < bv ? -1 * direction : 1 * direction;
      };
    }

    if (sortBy === "integration_type") {
      return (
        a: IShoppingMallLoggingIntegrationFailure.ISummary,
        b: IShoppingMallLoggingIntegrationFailure.ISummary,
      ): number => {
        const av = a.integration_type;
        const bv = b.integration_type;
        if (av === bv) return 0;
        return av < bv ? -1 * direction : 1 * direction;
      };
    }

    // For sortBy = "severity" and "partner_identifier", the DTO does not
    // expose explicit fields to derive those sort keys. We still exercise the
    // API with those configurations, but we skip strict ordering assertions.
    return null;
  };

  // Helper: validate that an array is sorted according to comparator
  const assertSorted = (
    title: string,
    data: IShoppingMallLoggingIntegrationFailure.ISummary[],
    comparator:
      | ((
          a: IShoppingMallLoggingIntegrationFailure.ISummary,
          b: IShoppingMallLoggingIntegrationFailure.ISummary,
        ) => number)
      | null,
  ): void => {
    if (comparator === null) return;
    if (data.length <= 1) return;
    let sorted = true;
    for (let i = 1; i < data.length; ++i) {
      if (comparator(data[i - 1], data[i]) > 0) {
        sorted = false;
        break;
      }
    }
    TestValidator.predicate(title, sorted);
  };

  // Helper: ensure no overlap between two pages by id
  const assertNoOverlapById = (
    title: string,
    first: IShoppingMallLoggingIntegrationFailure.ISummary[],
    second: IShoppingMallLoggingIntegrationFailure.ISummary[],
  ): void => {
    const ids = new Set(first.map((item) => item.id));
    const hasOverlap = second.some((item) => ids.has(item.id));
    TestValidator.predicate(title, !hasOverlap);
  };

  // 1. Join platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd-Admin",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Define base time window (last 30 days)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = fromDate.toISOString();
  const to = now.toISOString();

  // Sort configurations to exercise
  const sortConfigs: {
    sortBy:
      | "occurred_at"
      | "severity"
      | "integration_type"
      | "partner_identifier";
    sortOrder: "asc" | "desc";
  }[] = [
    { sortBy: "occurred_at", sortOrder: "desc" },
    { sortBy: "occurred_at", sortOrder: "asc" },
    { sortBy: "severity", sortOrder: "asc" },
    { sortBy: "severity", sortOrder: "desc" },
    { sortBy: "integration_type", sortOrder: "asc" },
    { sortBy: "integration_type", sortOrder: "desc" },
    { sortBy: "partner_identifier", sortOrder: "asc" },
    { sortBy: "partner_identifier", sortOrder: "desc" },
  ];

  // Moderate limit to likely produce multiple pages in populated environments
  const limit = 30 as number;

  for (const config of sortConfigs) {
    // 3. First page fetch for this sort configuration
    const requestBody = {
      from,
      to,
      limit,
      sortBy: config.sortBy,
      sortOrder: config.sortOrder,
    } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

    const firstPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
        connection,
        { body: requestBody },
      );
    typia.assert(firstPage);

    const { pagination, data } = firstPage;

    // Basic pagination sanity checks
    TestValidator.predicate(
      `pagination.limit is non-negative for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `pagination.records is non-negative for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination.pages is non-negative for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
      pagination.pages >= 0,
    );

    if (pagination.records === 0) {
      TestValidator.equals(
        `empty dataset yields empty data array for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
        data.length,
        0,
      );
    } else {
      TestValidator.predicate(
        `current page index within range for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
        pagination.current >= 0 &&
          (pagination.pages === 0 ||
            pagination.current <= pagination.pages - 1),
      );
    }

    const comparator = buildComparator(config.sortBy, config.sortOrder);
    assertSorted(
      `first page sorted by ${config.sortBy} ${config.sortOrder}`,
      data,
      comparator,
    );

    // 4. If there are multiple pages, fetch second page and validate
    if (pagination.pages > 1) {
      const secondRequestBody = {
        from,
        to,
        limit,
        page: 2 as number,
        sortBy: config.sortBy,
        sortOrder: config.sortOrder,
      } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

      const secondPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
        await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
          connection,
          { body: secondRequestBody },
        );
      typia.assert(secondPage);

      const secondData = secondPage.data;

      assertNoOverlapById(
        `no overlap between page 1 and page 2 for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
        data,
        secondData,
      );

      const combined = data.concat(secondData);
      assertSorted(
        `combined first two pages sorted by ${config.sortBy} ${config.sortOrder}`,
        combined,
        comparator,
      );
    }

    // 5. Out-of-range page index behavior
    const outOfRangePageIndex: number =
      pagination.pages > 0 ? pagination.pages + 10 : 9999;

    const outOfRangeRequestBody = {
      from,
      to,
      limit,
      page: outOfRangePageIndex as number,
      sortBy: config.sortBy,
      sortOrder: config.sortOrder,
    } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

    const outOfRangePage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
        connection,
        { body: outOfRangeRequestBody },
      );
    typia.assert(outOfRangePage);

    const outPagination = outOfRangePage.pagination;

    TestValidator.equals(
      `out-of-range page retains records count for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
      outPagination.records,
      pagination.records,
    );
    TestValidator.equals(
      `out-of-range page retains pages count for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
      outPagination.pages,
      pagination.pages,
    );

    if (outPagination.records === 0) {
      TestValidator.equals(
        `out-of-range page with no records has empty data for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
        outOfRangePage.data.length,
        0,
      );
      TestValidator.equals(
        `out-of-range page current index is 0 when no records for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
        outPagination.current,
        0,
      );
    } else if (outPagination.pages > 0) {
      TestValidator.predicate(
        `out-of-range page current index clamped within range for sortBy=${config.sortBy}, sortOrder=${config.sortOrder}`,
        outPagination.current >= 0 &&
          outPagination.current <= outPagination.pages - 1,
      );
    }
  }
}
