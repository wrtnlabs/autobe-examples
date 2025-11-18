import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCampaignMetric";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignMetric";

export async function test_api_admin_campaign_metrics_index_sorting_variants(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build a common request body with wide date range and large limit
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const baseRequest = {
    page: 1,
    limit: 50,
    date_from: thirtyDaysAgo.toISOString(),
    date_to: today.toISOString(),
    campaign_codes: undefined,
    min_gmv_amount: null,
    min_new_customer_order_count: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallCampaignMetric.IRequest;

  // Helper to check stats_date ordering
  const assertStatsDateSorted = async (
    title: string,
    data: IShoppingMallCampaignMetric.ISummary[],
    direction: "asc" | "desc",
  ): Promise<void> => {
    if (data.length <= 1) return;

    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].stats_date).getTime();
      const curr = new Date(data[i].stats_date).getTime();

      if (direction === "asc") {
        await TestValidator.predicate(
          `${title} - ascending stats_date at index ${i}`,
          prev <= curr,
        );
      } else {
        await TestValidator.predicate(
          `${title} - descending stats_date at index ${i}`,
          prev >= curr,
        );
      }
    }
  };

  // Helper to check numeric field sorting (new_customer_order_count)
  const assertNewCustomerOrderCountSortedDesc = async (
    title: string,
    data: IShoppingMallCampaignMetric.ISummary[],
  ): Promise<void> => {
    if (data.length <= 1) return;

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1].new_customer_order_count;
      const curr = data[i].new_customer_order_count;

      await TestValidator.predicate(
        `${title} - descending new_customer_order_count at index ${i}`,
        prev >= curr,
      );
    }
  };

  // 3. Request A: sort by stats_date desc
  const requestA = {
    ...baseRequest,
    sort_by: "stats_date",
    sort_direction: "desc",
  } satisfies IShoppingMallCampaignMetric.IRequest;

  const pageA: IPageIShoppingMallCampaignMetric.ISummary =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.index(
      connection,
      { body: requestA },
    );
  typia.assert(pageA);

  // basic pagination invariants for A
  TestValidator.predicate(
    "campaign metrics A - pagination.limit >= data.length",
    pageA.pagination.limit >= pageA.data.length,
  );
  TestValidator.predicate(
    "campaign metrics A - pagination.current >= 0",
    pageA.pagination.current >= 0,
  );
  TestValidator.predicate(
    "campaign metrics A - pagination.records >= 0",
    pageA.pagination.records >= 0,
  );
  TestValidator.predicate(
    "campaign metrics A - pagination.pages >= 0",
    pageA.pagination.pages >= 0,
  );

  await assertStatsDateSorted(
    "campaign metrics A stats_date desc",
    pageA.data,
    "desc",
  );

  if (pageA.data.length >= 2) {
    const firstDate = new Date(pageA.data[0].stats_date).getTime();
    const lastDate = new Date(
      pageA.data[pageA.data.length - 1].stats_date,
    ).getTime();

    await TestValidator.predicate(
      "campaign metrics A - firstDate >= lastDate",
      firstDate >= lastDate,
    );
  }

  // 4. Request B: sort by stats_date asc
  const requestB = {
    ...baseRequest,
    sort_by: "stats_date",
    sort_direction: "asc",
  } satisfies IShoppingMallCampaignMetric.IRequest;

  const pageB: IPageIShoppingMallCampaignMetric.ISummary =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.index(
      connection,
      { body: requestB },
    );
  typia.assert(pageB);

  // basic pagination invariants for B
  TestValidator.predicate(
    "campaign metrics B - pagination.limit >= data.length",
    pageB.pagination.limit >= pageB.data.length,
  );
  TestValidator.predicate(
    "campaign metrics B - pagination.current >= 0",
    pageB.pagination.current >= 0,
  );
  TestValidator.predicate(
    "campaign metrics B - pagination.records >= 0",
    pageB.pagination.records >= 0,
  );
  TestValidator.predicate(
    "campaign metrics B - pagination.pages >= 0",
    pageB.pagination.pages >= 0,
  );

  await assertStatsDateSorted(
    "campaign metrics B stats_date asc",
    pageB.data,
    "asc",
  );

  if (pageB.data.length >= 2) {
    const firstDate = new Date(pageB.data[0].stats_date).getTime();
    const lastDate = new Date(
      pageB.data[pageB.data.length - 1].stats_date,
    ).getTime();

    await TestValidator.predicate(
      "campaign metrics B - firstDate <= lastDate",
      firstDate <= lastDate,
    );
  }

  // 5. Request C: sort by new_customer_order_count desc
  const requestC = {
    ...baseRequest,
    sort_by: "new_customer_order_count",
    sort_direction: "desc",
  } satisfies IShoppingMallCampaignMetric.IRequest;

  const pageC: IPageIShoppingMallCampaignMetric.ISummary =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.index(
      connection,
      { body: requestC },
    );
  typia.assert(pageC);

  // basic pagination invariants for C
  TestValidator.predicate(
    "campaign metrics C - pagination.limit >= data.length",
    pageC.pagination.limit >= pageC.data.length,
  );
  TestValidator.predicate(
    "campaign metrics C - pagination.current >= 0",
    pageC.pagination.current >= 0,
  );
  TestValidator.predicate(
    "campaign metrics C - pagination.records >= 0",
    pageC.pagination.records >= 0,
  );
  TestValidator.predicate(
    "campaign metrics C - pagination.pages >= 0",
    pageC.pagination.pages >= 0,
  );

  await assertNewCustomerOrderCountSortedDesc(
    "campaign metrics C new_customer_order_count desc",
    pageC.data,
  );
}
