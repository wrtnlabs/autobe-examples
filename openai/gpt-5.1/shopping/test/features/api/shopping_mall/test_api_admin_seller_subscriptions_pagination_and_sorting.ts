import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAnalyticsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDateRange";
import type { IAnalyticsPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsPagination";
import type { IAnalyticsSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsSort";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscription";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown";
import type { IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_admin_seller_subscriptions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan
  const now = new Date();
  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planCreateBody },
    );
  typia.assert(plan);

  // 3. Seed many seller subscriptions (e.g., 36 records)
  const totalSubscriptions = 36;
  const seeded: IShoppingMallSellerSubscription[] = [];

  const sellerId = typia.random<string & tags.Format<"uuid">>();

  for (let i = 0; i < totalSubscriptions; i++) {
    const startedAtDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const statusOptions = ["active", "cancelled", "pending"] as const;
    const status = RandomGenerator.pick(statusOptions);

    const priceAmount = 50 + i; // ensure strictly increasing price
    const discountAmount = i % 3 === 0 ? 5 : 0;

    const createBody = {
      seller_id: sellerId,
      seller_subscription_plan_id: plan.id,
      status,
      started_at: startedAtDate.toISOString(),
      ended_at: null,
      next_billing_at: null,
      currency: "USD" as string & tags.MinLength<1>,
      price_amount: priceAmount,
      discount_amount: discountAmount,
      metadata_json: null,
    } satisfies IShoppingMallSellerSubscription.ICreate;

    const sub: IShoppingMallSellerSubscription =
      await api.functional.shoppingMall.admin.sellerSubscriptions.create(
        connection,
        { body: createBody },
      );
    typia.assert(sub);
    seeded.push(sub);
  }

  // Helper to build request body for index
  const buildRequestBody = (
    pagination: IAnalyticsPagination,
    sorts: IAnalyticsSort[],
  ): IShoppingMallSellerSubscription.IRequest => {
    return {
      date_range: undefined,
      date_range_type: undefined,
      plan_codes: [plan.code],
      seller_ids: [sellerId],
      statuses: undefined,
      group_by: undefined,
      metrics: undefined,
      pagination,
      sorts,
    } satisfies IShoppingMallSellerSubscription.IRequest;
  };

  const pageSize = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  // 4. Request page 1 with desc sort
  const paginationPage1: IAnalyticsPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    size: pageSize,
    cursor: undefined,
  };

  const sortsDesc: IAnalyticsSort[] = [
    {
      field: "total_net_subscription_revenue_amount",
      direction: "desc",
    },
  ];

  const page1Resp: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: buildRequestBody(paginationPage1, sortsDesc),
      },
    );
  typia.assert(page1Resp);

  const pagination1 = page1Resp.pagination;
  const data1 = page1Resp.data;

  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page1 current page matches request",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page1 limit matches request",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "total records should be at least seeded count",
    pagination1.records >= totalSubscriptions,
  );

  const expectedPages = Math.ceil(pagination1.records / pagination1.limit);
  TestValidator.equals(
    "pages equals ceil(records/limit)",
    pagination1.pages,
    expectedPages,
  );

  TestValidator.equals(
    "page1 data length equals limit (or records if smaller)",
    data1.length,
    Math.min(pagination1.limit, pagination1.records),
  );

  // Helper to extract a numeric key for ordering; since ISummary uses analytics fields,
  // we will fallback to price_amount when total_net_subscription_revenue_amount is not present.
  const getOrderKey = (
    summary: IShoppingMallSellerSubscription.ISummary,
  ): number => {
    // total_net_subscription_revenue_amount is part of analytics summary
    if (typeof summary.total_net_subscription_revenue_amount === "number")
      return summary.total_net_subscription_revenue_amount;
    // fallback: aggregate from plan_breakdowns if available
    if (summary.plan_breakdowns.length > 0)
      return summary.plan_breakdowns[0].net_revenue_amount;
    // final fallback: use total_recurring_price_amount
    return summary.total_recurring_price_amount;
  };

  // 5. Ensure descending order in page 1 according to order key
  for (let i = 1; i < data1.length; i++) {
    const prev = getOrderKey(data1[i - 1]);
    const curr = getOrderKey(data1[i]);
    TestValidator.predicate(
      `page1 descending order at index ${i}`,
      prev >= curr,
    );
  }

  // 6. Fetch page 2 and 3 with same sort
  const page2Resp: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: buildRequestBody(
          {
            page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
            size: pageSize,
            cursor: undefined,
          },
          sortsDesc,
        ),
      },
    );
  typia.assert(page2Resp);

  const page3Resp: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: buildRequestBody(
          {
            page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
            size: pageSize,
            cursor: undefined,
          },
          sortsDesc,
        ),
      },
    );
  typia.assert(page3Resp);

  const ids1 = data1.map((s) => s.seller.id);
  const ids2 = page2Resp.data.map((s) => s.seller.id);
  const ids3 = page3Resp.data.map((s) => s.seller.id);

  // Ensure no overlaps between pages (by seller id in summary)
  const hasOverlap = <T,>(a: T[], b: T[]): boolean => {
    const setA = new Set(a);
    return b.some((v) => setA.has(v));
  };

  TestValidator.predicate(
    "page1 and page2 have no overlapping sellers",
    !hasOverlap(ids1, ids2),
  );
  TestValidator.predicate(
    "page2 and page3 have no overlapping sellers",
    !hasOverlap(ids2, ids3),
  );

  // Ensure combined pages are still in descending order by order key
  const combinedDesc = [...data1, ...page2Resp.data, ...page3Resp.data];
  for (let i = 1; i < combinedDesc.length; i++) {
    const prev = getOrderKey(combinedDesc[i - 1]);
    const curr = getOrderKey(combinedDesc[i]);
    TestValidator.predicate(
      `combined descending order at index ${i}`,
      prev >= curr,
    );
  }

  // 7. Ascending sort comparison
  const sortsAsc: IAnalyticsSort[] = [
    {
      field: "total_net_subscription_revenue_amount",
      direction: "asc",
    },
  ];

  const page1AscResp: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: buildRequestBody(paginationPage1, sortsAsc),
      },
    );
  typia.assert(page1AscResp);

  const dataAsc = page1AscResp.data;
  for (let i = 1; i < dataAsc.length; i++) {
    const prev = getOrderKey(dataAsc[i - 1]);
    const curr = getOrderKey(dataAsc[i]);
    TestValidator.predicate(
      `page1 ascending order at index ${i}`,
      prev <= curr,
    );
  }

  if (combinedDesc.length > 0 && dataAsc.length > 0) {
    const firstDesc = getOrderKey(combinedDesc[0]);
    const lastDesc = getOrderKey(combinedDesc[combinedDesc.length - 1]);
    const firstAsc = getOrderKey(dataAsc[0]);
    const lastAsc = getOrderKey(dataAsc[dataAsc.length - 1]);

    TestValidator.predicate(
      "ascending first should be <= descending last",
      firstAsc <= lastDesc,
    );
    TestValidator.predicate(
      "ascending last should be >= descending first",
      lastAsc >= firstDesc,
    );
  }

  // 8. Out-of-range page request
  const outOfRangePage = pagination1.pages + 1;

  const outResp: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: buildRequestBody(
          {
            page: outOfRangePage as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            size: pageSize,
            cursor: undefined,
          },
          sortsDesc,
        ),
      },
    );
  typia.assert(outResp);

  TestValidator.equals(
    "out-of-range current page matches request",
    outResp.pagination.current,
    outOfRangePage,
  );
  TestValidator.equals(
    "out-of-range pages remain unchanged",
    outResp.pagination.pages,
    pagination1.pages,
  );
  TestValidator.equals(
    "out-of-range records remain unchanged",
    outResp.pagination.records,
    pagination1.records,
  );
  TestValidator.equals(
    "out-of-range data should be empty",
    outResp.data.length,
    0,
  );
}
