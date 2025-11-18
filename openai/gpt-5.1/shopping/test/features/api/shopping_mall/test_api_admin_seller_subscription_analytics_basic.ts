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

export async function test_api_admin_seller_subscription_analytics_basic(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Build analytics request body with minimal filters but concrete date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRange = {
    from: thirtyDaysAgo.toISOString(),
    to: now.toISOString(),
  } satisfies IAnalyticsDateRange;

  const pagination = {
    page: 1,
    size: 20,
  } satisfies IAnalyticsPagination;

  const sorts: IAnalyticsSort[] = [
    {
      field: "total_net_subscription_revenue_amount",
      direction: "desc",
    },
  ];

  const requestBody = {
    date_range: dateRange,
    date_range_type: "started_at",
    group_by: ["plan"],
    pagination,
    sorts,
  } satisfies IShoppingMallSellerSubscription.IRequest;

  // 3. Call analytics endpoint
  const page: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerSubscription.ISummary>(page);

  const { pagination: pageInfo, data } = page;

  // 4. Basic pagination validations
  TestValidator.predicate(
    "pagination current page is non-negative",
    pageInfo.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pageInfo.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageInfo.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageInfo.pages >= 0,
  );

  if (pageInfo.records === 0) {
    // If there are no records, data should be empty and pages should be 0
    TestValidator.equals("no records implies empty data list", data.length, 0);
    TestValidator.equals("no records implies zero pages", pageInfo.pages, 0);
    return;
  }

  // If there are records, pages should be at least 1 and data length <= limit
  TestValidator.predicate(
    "records > 0 implies pages >= 1",
    pageInfo.pages >= 1,
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    data.length <= pageInfo.limit,
  );

  // 5. Row-level business validations
  if (data.length === 0) return; // tolerate edge-case where records>0 but current page has 0 rows

  const firstCurrency = data[0].currency;
  TestValidator.predicate(
    "first row currency is non-empty string",
    typeof firstCurrency === "string" && firstCurrency.length > 0,
  );

  for (const row of data) {
    typia.assert<IShoppingMallSellerSubscription.ISummary>(row);

    // 5.1 Currency consistency
    TestValidator.equals(
      "all rows share same currency",
      row.currency,
      firstCurrency,
    );

    // 5.2 Period consistency: period_start <= period_end and overlaps requested range
    const periodStart = new Date(row.period_start);
    const periodEnd = new Date(row.period_end);
    TestValidator.predicate(
      "period_start is not after period_end",
      periodStart.getTime() <= periodEnd.getTime(),
    );

    // Overlap check: periodEnd >= from && periodStart <= to
    TestValidator.predicate(
      "period overlaps requested date range",
      periodEnd.getTime() >= thirtyDaysAgo.getTime() &&
        periodStart.getTime() <= now.getTime(),
    );

    // 5.3 Non-negative integer counts
    TestValidator.predicate(
      "total_active_subscriptions is non-negative",
      row.total_active_subscriptions >= 0,
    );
    TestValidator.predicate(
      "total_new_subscriptions is non-negative",
      row.total_new_subscriptions >= 0,
    );
    TestValidator.predicate(
      "total_cancelled_subscriptions is non-negative",
      row.total_cancelled_subscriptions >= 0,
    );

    // 5.4 Monetary metrics and net ≈ recurring - discount
    const recurring = row.total_recurring_price_amount;
    const discount = row.total_discount_amount;
    const net = row.total_net_subscription_revenue_amount;

    const reconstructedNet = recurring - discount;
    const epsilon = 1e-6;
    TestValidator.predicate(
      "net revenue approximately equals recurring minus discount",
      Math.abs(net - reconstructedNet) <= epsilon,
    );

    // 5.5 status_breakdowns presence and basic consistency
    TestValidator.predicate(
      "status_breakdowns array is present",
      Array.isArray(row.status_breakdowns),
    );

    let statusSubscriptionCount = 0;
    let statusRecurringTotal = 0;
    let statusDiscountTotal = 0;
    let statusNetTotal = 0;

    for (const statusRow of row.status_breakdowns) {
      typia.assert<IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown.ISummary>(
        statusRow,
      );
      TestValidator.predicate(
        "status breakdown subscription_count is non-negative",
        statusRow.subscription_count >= 0,
      );
      statusSubscriptionCount += statusRow.subscription_count;
      statusRecurringTotal += statusRow.recurring_price_amount;
      statusDiscountTotal += statusRow.discount_amount;
      statusNetTotal += statusRow.net_revenue_amount;
    }

    // Allow breakdown totals to be less than or equal to parent totals due to filters
    TestValidator.predicate(
      "status breakdown subscription_count does not exceed total_active_subscriptions plus new and cancelled",
      statusSubscriptionCount <=
        row.total_active_subscriptions +
          row.total_new_subscriptions +
          row.total_cancelled_subscriptions,
    );
    TestValidator.predicate(
      "status breakdown recurring amount does not exceed total_recurring_price_amount",
      statusRecurringTotal <= recurring + epsilon,
    );
    TestValidator.predicate(
      "status breakdown discount amount does not exceed total_discount_amount",
      statusDiscountTotal <= discount + epsilon,
    );
    TestValidator.predicate(
      "status breakdown net amount does not exceed total_net_subscription_revenue_amount",
      statusNetTotal <= net + epsilon,
    );

    // 5.6 plan_breakdowns presence and basic consistency
    TestValidator.predicate(
      "plan_breakdowns array is present",
      Array.isArray(row.plan_breakdowns),
    );

    let planSubscriptionCount = 0;
    let planActiveSubscriptionCount = 0;
    let planRecurringTotal = 0;
    let planDiscountTotal = 0;
    let planNetTotal = 0;

    for (const planRow of row.plan_breakdowns) {
      typia.assert<IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown.ISummary>(
        planRow,
      );

      typia.assert<IShoppingMallSellerSubscriptionPlan.ISummary>(planRow.plan);

      TestValidator.predicate(
        "plan breakdown subscription_count is non-negative",
        planRow.subscription_count >= 0,
      );
      TestValidator.predicate(
        "plan breakdown active_subscription_count is non-negative",
        planRow.active_subscription_count >= 0,
      );

      planSubscriptionCount += planRow.subscription_count;
      planActiveSubscriptionCount += planRow.active_subscription_count;
      planRecurringTotal += planRow.recurring_price_amount;
      planDiscountTotal += planRow.discount_amount;
      planNetTotal += planRow.net_revenue_amount;
    }

    TestValidator.predicate(
      "plan breakdown subscription_count does not exceed total_new_subscriptions plus active and cancelled",
      planSubscriptionCount <=
        row.total_active_subscriptions +
          row.total_new_subscriptions +
          row.total_cancelled_subscriptions,
    );
    TestValidator.predicate(
      "plan breakdown active_subscription_count does not exceed total_active_subscriptions",
      planActiveSubscriptionCount <= row.total_active_subscriptions,
    );
    TestValidator.predicate(
      "plan breakdown recurring amount does not exceed total_recurring_price_amount",
      planRecurringTotal <= recurring + epsilon,
    );
    TestValidator.predicate(
      "plan breakdown discount amount does not exceed total_discount_amount",
      planDiscountTotal <= discount + epsilon,
    );
    TestValidator.predicate(
      "plan breakdown net amount does not exceed total_net_subscription_revenue_amount",
      planNetTotal <= net + epsilon,
    );

    // Basic seller summary checks
    typia.assert<IShoppingMallSeller.ISummary>(row.seller);
  }
}
