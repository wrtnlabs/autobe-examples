import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerDailyStat";

export async function test_api_admin_customer_daily_stats_sorting_and_pagination_consistency(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain Authorization header via SDK side effect
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a generic analytics-related config so that environment is initialized
  const configInput = typia.random<IShoppingMallConfig.ICreate>();
  const config: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configInput,
    });
  typia.assert<IShoppingMallConfig>(config);

  // 3. Prepare a wide statsDate range for analytics query
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs);
  const toDate = new Date(now.getTime() + thirtyDaysMs);

  const limit: number & tags.Type<"int32"> = 20 as number & tags.Type<"int32">;

  const baseRequest: IShoppingMallCustomerDailyStat.IRequest = {
    statsDateFrom: fromDate.toISOString(),
    statsDateTo: toDate.toISOString(),
    page: 1 as number & tags.Type<"int32">,
    limit,
    sortBy: "stats_date",
    sortOrder: "desc",
  };

  // Helper to assert non-increasing stats_date order in a page
  const assertNonIncreasingStatsDate = (
    title: string,
    items: IShoppingMallCustomerDailyStat.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; ++i) {
      const prev = new Date(items[i - 1].stats_date).getTime();
      const curr = new Date(items[i].stats_date).getTime();
      TestValidator.predicate(
        `${title} stats_date[${i - 1}] >= stats_date[${i}]`,
        prev >= curr,
      );
    }
  };

  // Helper to assert non-decreasing stats_date order in a page
  const assertNonDecreasingStatsDate = (
    title: string,
    items: IShoppingMallCustomerDailyStat.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; ++i) {
      const prev = new Date(items[i - 1].stats_date).getTime();
      const curr = new Date(items[i].stats_date).getTime();
      TestValidator.predicate(
        `${title} stats_date[${i - 1}] <= stats_date[${i}]`,
        prev <= curr,
      );
    }
  };

  // 4. Page 1, sort by stats_date desc
  const page1: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerDailyStat.ISummary>(page1);

  TestValidator.predicate(
    "page1 size must not exceed limit",
    page1.data.length <= limit,
  );
  assertNonIncreasingStatsDate("page1 desc", page1.data);

  const totalRecords = page1.pagination.records;
  const hasAnyData = page1.data.length > 0;

  // 5. Page 2, same sorting, if there are more than `limit` records
  let page2: IPageIShoppingMallCustomerDailyStat.ISummary | null = null;
  if (totalRecords > limit) {
    page2 =
      await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
        connection,
        {
          body: {
            ...baseRequest,
            page: 2 as number & tags.Type<"int32">,
          },
        },
      );
    typia.assert<IPageIShoppingMallCustomerDailyStat.ISummary>(page2);

    TestValidator.predicate(
      "page2 size must not exceed limit when records > limit",
      page2.data.length <= limit,
    );
    assertNonIncreasingStatsDate("page2 desc", page2.data);

    // Ensure that no item from page1 appears again in page2 (by id)
    const page1Ids = new Set<string>(page1.data.map((r) => r.id));
    for (const item of page2.data) {
      TestValidator.predicate(
        "page2 id must not appear in page1",
        page1Ids.has(item.id) === false,
      );
    }

    // Combined ordering: page1 followed by page2 must still be non-increasing
    const combined = page1.data.concat(page2.data);
    assertNonIncreasingStatsDate("page1+page2 desc", combined);
  }

  // 6. Ascending order check on stats_date (page 1 only)
  const pageAsc: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: {
          ...baseRequest,
          sortOrder: "asc",
          page: 1 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert<IPageIShoppingMallCustomerDailyStat.ISummary>(pageAsc);

  TestValidator.predicate(
    "pageAsc size must not exceed limit",
    pageAsc.data.length <= limit,
  );
  assertNonDecreasingStatsDate("page1 asc", pageAsc.data);

  // If both desc and asc pages have at least 2 elements, ensure their order differs
  if (page1.data.length >= 2 && pageAsc.data.length >= 2 && hasAnyData) {
    const sameOrder =
      page1.data.length === pageAsc.data.length &&
      page1.data.every((item, idx) => item.id === pageAsc.data[idx].id);

    TestValidator.predicate(
      "ascending vs descending order should differ when enough data",
      sameOrder === false,
    );
  }

  // 7. Optional: verify sorting by gmv_amount when there is enough variance
  const gmvDesc: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: {
          ...baseRequest,
          sortBy: "gmv_amount",
          sortOrder: "desc",
        },
      },
    );
  typia.assert<IPageIShoppingMallCustomerDailyStat.ISummary>(gmvDesc);

  const gmvValues = gmvDesc.data.map((r) => r.gmv_amount);
  const hasGmvVariance = gmvValues.some((v) => v !== gmvValues[0]);

  const assertNonIncreasingGmv = (
    title: string,
    items: IShoppingMallCustomerDailyStat.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; ++i) {
      TestValidator.predicate(
        `${title} gmv_amount[${i - 1}] >= gmv_amount[${i}]`,
        items[i - 1].gmv_amount >= items[i].gmv_amount,
      );
    }
  };

  const assertNonDecreasingGmv = (
    title: string,
    items: IShoppingMallCustomerDailyStat.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; ++i) {
      TestValidator.predicate(
        `${title} gmv_amount[${i - 1}] <= gmv_amount[${i}]`,
        items[i - 1].gmv_amount <= items[i].gmv_amount,
      );
    }
  };

  if (gmvDesc.data.length > 0) {
    TestValidator.predicate(
      "gmv desc page size must not exceed limit",
      gmvDesc.data.length <= limit,
    );
    assertNonIncreasingGmv("gmv desc", gmvDesc.data);
  }

  if (hasGmvVariance && gmvDesc.data.length > 1) {
    const gmvAsc: IPageIShoppingMallCustomerDailyStat.ISummary =
      await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
        connection,
        {
          body: {
            ...baseRequest,
            sortBy: "gmv_amount",
            sortOrder: "asc",
          },
        },
      );
    typia.assert<IPageIShoppingMallCustomerDailyStat.ISummary>(gmvAsc);

    TestValidator.predicate(
      "gmv asc page size must not exceed limit",
      gmvAsc.data.length <= limit,
    );
    assertNonDecreasingGmv("gmv asc", gmvAsc.data);
  }
}
