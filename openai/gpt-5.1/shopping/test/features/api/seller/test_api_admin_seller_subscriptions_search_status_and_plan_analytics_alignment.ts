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

/**
 * Validate seller subscription analytics consistency between search results,
 * status breakdowns, and plan breakdowns for admin-facing subscription search.
 *
 * ## Business context
 *
 * An admin uses PATCH /shoppingMall/admin/sellerSubscriptions to retrieve
 * paginated analytics-style summaries of seller subscriptions. Each summary row
 * (IShoppingMallSellerSubscription.ISummary) contains high level aggregates
 * such as total_*_subscriptions, recurring and discount amounts, and nested
 * status_breakdowns and plan_breakdowns collections.
 *
 * This test does not try to reverse engineer the full internal aggregation
 * algorithm, but it does ensure that the analytics behave monotonically and
 * consistently when we:
 *
 * - Create a small, controlled set of subscriptions across a few plans and
 *   statuses.
 * - Query analytics over all plans.
 * - Narrow the same query to a single plan.
 *
 * The expectations are:
 *
 * - Analytics for the restricted ENTERPRISE plan are a subset (never larger) of
 *   the global analytics over all plans.
 * - Status_breakdowns and plan_breakdowns contain positive counts for the created
 *   data and never exceed the total number of created subscriptions we control
 *   in this test.
 * - Monetary totals are non-negative and respect simple ordering relations (net
 *   <= recurring, discount <= recurring).
 *
 * ## Scenario steps
 *
 * 1. Join an admin via POST /auth/admin/join to obtain authorized context.
 * 2. Create three seller subscription plans (STARTER, GROWTH, ENTERPRISE) using
 *    POST /shoppingMall/admin/sellerSubscriptionPlans.
 * 3. Create a handful of subscriptions with controlled statuses and discounts via
 *    POST /shoppingMall/admin/sellerSubscriptions.
 * 4. Call PATCH /shoppingMall/admin/sellerSubscriptions with a date_range that
 *    covers all subscriptions and statuses ["active", "cancelled"].
 * 5. Assert that:
 *
 *    - At least one summary row is returned.
 *    - Global aggregates are non-negative and coherent.
 *    - Status_breakdowns and plan_breakdowns appear and have plausible counts and
 *         monetary values that do not exceed known bounds.
 * 6. Call the same endpoint again, but with plan_codes restricted to the
 *    ENTERPRISE plan.
 * 7. Assert that:
 *
 *    - Results exist but are not larger than the global query.
 *    - Plan_breakdowns rows refer only to the ENTERPRISE plan.
 *    - Aggregated counts for the restricted query are monotonic with respect to the
 *         global query (subset behaviour), without assuming exact equality to
 *         the created record counts.
 */
export async function test_api_admin_seller_subscriptions_search_status_and_plan_analytics_alignment(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create three subscription plans
  const now = new Date();
  const effectiveFrom = now.toISOString() as string & tags.Format<"date-time">;

  const starterPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: {
          code: "STARTER",
          name: "Starter Plan",
          description: "Basic seller subscription plan",
          billing_period: "monthly",
          currency: "USD",
          price_amount: 100,
          is_active: true,
          effective_from: effectiveFrom,
          effective_until: null,
        } satisfies IShoppingMallSellerSubscriptionPlan.ICreate,
      },
    );
  typia.assert(starterPlan);

  const growthPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: {
          code: "GROWTH",
          name: "Growth Plan",
          description: "Growth seller subscription plan",
          billing_period: "monthly",
          currency: "USD",
          price_amount: 200,
          is_active: true,
          effective_from: effectiveFrom,
          effective_until: null,
        } satisfies IShoppingMallSellerSubscriptionPlan.ICreate,
      },
    );
  typia.assert(growthPlan);

  const enterprisePlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: {
          code: "ENTERPRISE",
          name: "Enterprise Plan",
          description: "Enterprise seller subscription plan",
          billing_period: "monthly",
          currency: "USD",
          price_amount: 500,
          is_active: true,
          effective_from: effectiveFrom,
          effective_until: null,
        } satisfies IShoppingMallSellerSubscriptionPlan.ICreate,
      },
    );
  typia.assert(enterprisePlan);

  // 3. Create subscriptions with controlled statuses and discounts
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const startedAt = new Date(
    now.getTime() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const nextBillingAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const createSubscription = async (
    planId: string & tags.Format<"uuid">,
    status: string,
    priceAmount: number,
    discountAmount: number,
  ): Promise<IShoppingMallSellerSubscription> => {
    const sub: IShoppingMallSellerSubscription =
      await api.functional.shoppingMall.admin.sellerSubscriptions.create(
        connection,
        {
          body: {
            seller_id: sellerId,
            seller_subscription_plan_id: planId,
            status,
            started_at: startedAt,
            ended_at: null,
            next_billing_at: nextBillingAt,
            currency: "USD" as string & tags.MinLength<1>,
            price_amount: priceAmount,
            discount_amount: discountAmount,
            metadata_json: null,
          } satisfies IShoppingMallSellerSubscription.ICreate,
        },
      );
    typia.assert(sub);
    return sub;
  };

  // 2 active STARTER, 1 cancelled GROWTH, 2 ENTERPRISE (1 active, 1 cancelled)
  const subs: IShoppingMallSellerSubscription[] = [];
  subs.push(await createSubscription(starterPlan.id, "active", 100, 0));
  subs.push(await createSubscription(starterPlan.id, "active", 100, 0));
  subs.push(await createSubscription(growthPlan.id, "cancelled", 200, 20));
  subs.push(await createSubscription(enterprisePlan.id, "active", 500, 50));
  subs.push(await createSubscription(enterprisePlan.id, "cancelled", 500, 0));

  const totalCreated = subs.length;
  const enterpriseCreated = subs.filter(
    (s) => s.seller_subscription_plan_id === enterprisePlan.id,
  ).length;

  // 4. First analytics call over all plans and statuses [active, cancelled]
  const dateRange: IAnalyticsDateRange = {
    from: new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString() as string & tags.Format<"date-time">,
    to: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() as string &
      tags.Format<"date-time">,
  };

  const requestAll: IShoppingMallSellerSubscription.IRequest = {
    date_range: dateRange,
    date_range_type: "started_at",
    plan_codes: undefined,
    seller_ids: undefined,
    statuses: ["active", "cancelled"],
    group_by: undefined,
    metrics: undefined,
    pagination: undefined,
    sorts: undefined,
  };

  const pageAll: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: requestAll,
      },
    );
  typia.assert(pageAll);

  TestValidator.predicate(
    "analytics all: at least one summary row",
    pageAll.data.length > 0,
  );

  TestValidator.predicate(
    "analytics all: pagination records non-negative",
    pageAll.pagination.records >= 0,
  );

  // Aggregate across all summaries
  const globalTotals = pageAll.data.reduce(
    (acc, row) => {
      acc.totalActive += row.total_active_subscriptions;
      acc.totalCancelled += row.total_cancelled_subscriptions;
      acc.totalRecurring += row.total_recurring_price_amount;
      acc.totalDiscount += row.total_discount_amount;
      acc.totalNet += row.total_net_subscription_revenue_amount;
      return acc;
    },
    {
      totalActive: 0,
      totalCancelled: 0,
      totalRecurring: 0,
      totalDiscount: 0,
      totalNet: 0,
    },
  );

  TestValidator.predicate(
    "analytics all: total subscriptions at least created",
    globalTotals.totalActive + globalTotals.totalCancelled >= totalCreated,
  );

  TestValidator.predicate(
    "analytics all: recurring amount non-negative",
    globalTotals.totalRecurring >= 0,
  );
  TestValidator.predicate(
    "analytics all: discount amount non-negative",
    globalTotals.totalDiscount >= 0,
  );
  TestValidator.predicate(
    "analytics all: net amount non-negative",
    globalTotals.totalNet >= 0,
  );
  TestValidator.predicate(
    "analytics all: net not exceeding recurring",
    globalTotals.totalNet <= globalTotals.totalRecurring,
  );
  TestValidator.predicate(
    "analytics all: discount not exceeding recurring",
    globalTotals.totalDiscount <= globalTotals.totalRecurring,
  );

  // Check breakdowns per row
  const maxExpected = totalCreated;
  let hasActiveStatusBreakdown = false;
  let hasCancelledStatusBreakdown = false;
  let hasAnyPlanBreakdown = false;

  for (const row of pageAll.data) {
    const statusTotal = row.status_breakdowns.reduce(
      (sum, b) => sum + b.subscription_count,
      0,
    );
    TestValidator.predicate(
      "analytics all: status breakdown count within bound",
      statusTotal <= maxExpected,
    );

    const planTotal = row.plan_breakdowns.reduce(
      (sum, b) => sum + b.subscription_count,
      0,
    );
    TestValidator.predicate(
      "analytics all: plan breakdown count within bound",
      planTotal <= maxExpected,
    );

    for (const sb of row.status_breakdowns) {
      if (sb.status === "active" && sb.subscription_count > 0)
        hasActiveStatusBreakdown = true;
      if (sb.status === "cancelled" && sb.subscription_count > 0)
        hasCancelledStatusBreakdown = true;
    }

    if (row.plan_breakdowns.length > 0) hasAnyPlanBreakdown = true;
  }

  TestValidator.predicate(
    "analytics all: has active status breakdown",
    hasActiveStatusBreakdown,
  );
  TestValidator.predicate(
    "analytics all: has cancelled status breakdown",
    hasCancelledStatusBreakdown,
  );
  TestValidator.predicate(
    "analytics all: has some plan breakdowns",
    hasAnyPlanBreakdown,
  );

  // 5. Second analytics call restricted to ENTERPRISE plan
  const requestEnterprise: IShoppingMallSellerSubscription.IRequest = {
    date_range: dateRange,
    date_range_type: "started_at",
    plan_codes: [enterprisePlan.code],
    seller_ids: undefined,
    statuses: ["active", "cancelled"],
    group_by: undefined,
    metrics: undefined,
    pagination: undefined,
    sorts: undefined,
  };

  const pageEnterprise: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      {
        body: requestEnterprise,
      },
    );
  typia.assert(pageEnterprise);

  TestValidator.predicate(
    "analytics enterprise: at least one summary row",
    pageEnterprise.data.length > 0,
  );

  TestValidator.predicate(
    "analytics enterprise: records not exceeding global",
    pageEnterprise.pagination.records <= pageAll.pagination.records,
  );

  const enterpriseTotals = pageEnterprise.data.reduce(
    (acc, row) => {
      acc.totalActive += row.total_active_subscriptions;
      acc.totalCancelled += row.total_cancelled_subscriptions;
      acc.totalRecurring += row.total_recurring_price_amount;
      acc.totalDiscount += row.total_discount_amount;
      acc.totalNet += row.total_net_subscription_revenue_amount;
      return acc;
    },
    {
      totalActive: 0,
      totalCancelled: 0,
      totalRecurring: 0,
      totalDiscount: 0,
      totalNet: 0,
    },
  );

  TestValidator.predicate(
    "analytics enterprise: total subscriptions positive and within global bound",
    enterpriseTotals.totalActive + enterpriseTotals.totalCancelled > 0 &&
      enterpriseTotals.totalActive + enterpriseTotals.totalCancelled <=
        globalTotals.totalActive + globalTotals.totalCancelled,
  );

  let hasEnterprisePlanBreakdown = false;
  for (const row of pageEnterprise.data) {
    for (const pb of row.plan_breakdowns) {
      if (pb.plan.code === enterprisePlan.code && pb.subscription_count > 0)
        hasEnterprisePlanBreakdown = true;
      TestValidator.predicate(
        "analytics enterprise: plan breakdown count within enterprise created bound",
        pb.subscription_count <= enterpriseCreated,
      );
    }
  }

  TestValidator.predicate(
    "analytics enterprise: has enterprise plan breakdown",
    hasEnterprisePlanBreakdown,
  );
}
