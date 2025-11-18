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
 * Verify that admin seller subscription analytics search accepts `date_range`
 * and `date_range_type` and returns structurally valid analytics pages for
 * different lifecycle timestamp modes.
 *
 * Business goal: The PATCH /shoppingMall/admin/sellerSubscriptions endpoint
 * accepts an IShoppingMallSellerSubscription.IRequest body that can carry a
 * `date_range` and a `date_range_type` string. This test ensures that the
 * backend can:
 *
 * - Accept an authenticated admin context
 * - Create a seller subscription plan
 * - Create multiple seller subscriptions under that plan with distinct lifecycle
 *   timestamps
 * - Successfully process analytics-style queries for three different
 *   `date_range_type` values ("started_at", "ended_at", "next_billing_at")
 *   using corresponding date windows
 * - Return results conforming to the
 *   IPageIShoppingMallSellerSubscription.ISummary contract for each call.
 *
 * Due to the fact that IShoppingMallSellerSubscription.ISummary is an analytics
 * summary type and does not expose individual subscription lifecycle
 * timestamps, this test focuses on validating:
 *
 * - That each variant of `date_range_type` + `date_range` produces a structurally
 *   valid analytics page response
 * - That pagination metadata matches the data length for each call
 * - That analytics summaries are returned for the seller cohort and plan we
 *   created (by checking seller currency/period fields are present and arrays
 *   of breakdowns are structurally valid).
 */
export async function test_api_admin_seller_subscriptions_filter_by_date_range_type(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a single subscription plan that all subscriptions will share
  const now = new Date();
  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planCreateBody },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create seller subscriptions with controlled timestamps relative to a base
  const baseTime = new Date();
  const oneHour = 60 * 60 * 1000;

  // Define three disjoint windows for started_at, ended_at, next_billing_at
  const startWindowFrom = new Date(baseTime.getTime() - 3 * oneHour);
  const startWindowTo = new Date(baseTime.getTime() - 1 * oneHour);

  const endWindowFrom = new Date(baseTime.getTime() + 1 * oneHour);
  const endWindowTo = new Date(baseTime.getTime() + 3 * oneHour);

  const billingWindowFrom = new Date(baseTime.getTime() + 4 * oneHour);
  const billingWindowTo = new Date(baseTime.getTime() + 6 * oneHour);

  const sellerIds: (string & tags.Format<"uuid">)[] = [];

  const createSubscription = async (
    sellerId: string & tags.Format<"uuid">,
    startedAt: Date,
    endedAt: Date | null,
    nextBillingAt: Date | null,
  ): Promise<IShoppingMallSellerSubscription> => {
    const body = {
      seller_id: sellerId,
      seller_subscription_plan_id: plan.id,
      status: "active",
      started_at: startedAt.toISOString(),
      ended_at: endedAt ? endedAt.toISOString() : null,
      next_billing_at: nextBillingAt ? nextBillingAt.toISOString() : null,
      currency: plan.currency satisfies string as string,
      price_amount: plan.price_amount,
      discount_amount: 0,
      metadata_json: null,
    } satisfies IShoppingMallSellerSubscription.ICreate;

    const subscription: IShoppingMallSellerSubscription =
      await api.functional.shoppingMall.admin.sellerSubscriptions.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallSellerSubscription>(subscription);
    return subscription;
  };

  // Group A: started_at inside start window, ended_at null
  for (let i = 0; i < 2; i++) {
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    sellerIds.push(sellerId);
    const startedAt = new Date(
      startWindowFrom.getTime() + (i + 1) * (oneHour / 4),
    );
    await createSubscription(sellerId, startedAt, null, null);
  }

  // Group B: started_at outside start window, ended_at inside end window
  for (let i = 0; i < 2; i++) {
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    sellerIds.push(sellerId);
    const startedAt = new Date(startWindowTo.getTime() + 4 * oneHour); // clearly after start window
    const endedAt = new Date(endWindowFrom.getTime() + (i + 1) * (oneHour / 4));
    await createSubscription(sellerId, startedAt, endedAt, null);
  }

  // Group C: started_at and ended_at outside both windows, next_billing_at in billing window
  for (let i = 0; i < 2; i++) {
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    sellerIds.push(sellerId);
    const startedAt = new Date(startWindowFrom.getTime() - 4 * oneHour); // long before start window
    const endedAt = new Date(endWindowTo.getTime() + 4 * oneHour); // long after end window
    const nextBillingAt = new Date(
      billingWindowFrom.getTime() + (i + 1) * (oneHour / 4),
    );
    await createSubscription(sellerId, startedAt, endedAt, nextBillingAt);
  }

  const toIsoRange = (from: Date, to: Date): IAnalyticsDateRange => ({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const pagination: IAnalyticsPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    size: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    cursor: undefined,
  };

  const commonRequestPart: IShoppingMallSellerSubscription.IRequest = {
    seller_ids: sellerIds,
    plan_codes: [plan.code],
    statuses: undefined,
    group_by: undefined,
    metrics: undefined,
    pagination,
    sorts: undefined,
    date_range: undefined,
    date_range_type: undefined,
  };

  const assertPageStructure = (
    titlePrefix: string,
    page: IPageIShoppingMallSellerSubscription.ISummary,
  ): void => {
    // Basic structural checks on pagination
    TestValidator.equals(
      `${titlePrefix}: pagination.records equals data length`,
      page.pagination.records,
      page.data.length,
    );

    TestValidator.predicate(
      `${titlePrefix}: pagination.current is non-negative`,
      page.pagination.current >= 0,
    );

    TestValidator.predicate(
      `${titlePrefix}: pagination.limit is non-negative`,
      page.pagination.limit >= 0,
    );

    TestValidator.predicate(
      `${titlePrefix}: pagination.pages is non-negative`,
      page.pagination.pages >= 0,
    );

    // Structural checks on each analytics summary entry
    for (const summary of page.data) {
      // seller summary
      TestValidator.predicate(
        `${titlePrefix}: seller has valid id`,
        summary.seller.id.length > 0,
      );

      TestValidator.predicate(
        `${titlePrefix}: seller email non-empty`,
        summary.seller.email.length > 0,
      );

      // period bounds and currency are non-empty
      TestValidator.predicate(
        `${titlePrefix}: period_start non-empty`,
        summary.period_start.length > 0,
      );

      TestValidator.predicate(
        `${titlePrefix}: period_end non-empty`,
        summary.period_end.length > 0,
      );

      TestValidator.predicate(
        `${titlePrefix}: currency non-empty`,
        summary.currency.length > 0,
      );

      // Arrays for breakdowns exist (may be empty but not undefined)
      TestValidator.predicate(
        `${titlePrefix}: status_breakdowns array defined`,
        Array.isArray(summary.status_breakdowns),
      );

      TestValidator.predicate(
        `${titlePrefix}: plan_breakdowns array defined`,
        Array.isArray(summary.plan_breakdowns),
      );
    }
  };

  // 4. date_range_type = "started_at" with start window
  const startedAtRequest: IShoppingMallSellerSubscription.IRequest = {
    ...commonRequestPart,
    date_range_type: "started_at",
    date_range: toIsoRange(startWindowFrom, startWindowTo),
  };

  const startedAtPage: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      { body: startedAtRequest },
    );
  typia.assert<IPageIShoppingMallSellerSubscription.ISummary>(startedAtPage);

  assertPageStructure("started_at filter", startedAtPage);

  // 5. date_range_type = "ended_at" with end window
  const endedAtRequest: IShoppingMallSellerSubscription.IRequest = {
    ...commonRequestPart,
    date_range_type: "ended_at",
    date_range: toIsoRange(endWindowFrom, endWindowTo),
  };

  const endedAtPage: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      { body: endedAtRequest },
    );
  typia.assert<IPageIShoppingMallSellerSubscription.ISummary>(endedAtPage);

  assertPageStructure("ended_at filter", endedAtPage);

  // 6. date_range_type = "next_billing_at" with billing window
  const billingRequest: IShoppingMallSellerSubscription.IRequest = {
    ...commonRequestPart,
    date_range_type: "next_billing_at",
    date_range: toIsoRange(billingWindowFrom, billingWindowTo),
  };

  const billingPage: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.sellerSubscriptions.index(
      connection,
      { body: billingRequest },
    );
  typia.assert<IPageIShoppingMallSellerSubscription.ISummary>(billingPage);

  assertPageStructure("next_billing_at filter", billingPage);

  // Optional sanity: it is acceptable that some pages contain zero analytics
  // rows depending on server-side interpretation of windows, but the
  // responses must always be structurally valid.
}
