import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEarningsAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsAnalytics";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

export async function test_api_seller_earnings_segmented_by_region_with_multiple_payouts(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a guest cart to ensure unrelated activity does not break analytics
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (e2e-test)",
    referrer: "https://shoppingmall.test/home",
    region_code: "R-GUEST",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Prepare two conceptual sellers (S1 and S2) by UUID only. We don't have seller creation here,
  //    but seller_id must be UUID, and analytics will aggregate by seller and segment.
  const sellerId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // For period windows, use now and +/- some range.
  const now = new Date();
  const periodStart1 = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const periodEnd1 = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour ahead
  const periodStart2 = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
  const periodEnd2 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours ahead

  // Helper to build scheduled payout timestamps
  const scheduledPayoutAt1 = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();
  const scheduledPayoutAt2 = new Date(
    now.getTime() + 3 * 60 * 60 * 1000,
  ).toISOString();

  // 3-a. Create payouts for seller S1 (conceptual region R1) with mixed statuses
  const payoutS1CompletedBody = {
    seller_id: sellerId1,
    currency_code: "USD",
    gross_amount: 1000,
    fee_amount: 100,
    adjustment_amount: 0,
    net_amount: 900,
    period_start: periodStart1,
    period_end: periodEnd1,
    payout_status: "completed",
    scheduled_payout_at: scheduledPayoutAt1,
    memo: "S1 R1 completed batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payoutS1PendingBody = {
    seller_id: sellerId1,
    currency_code: "USD",
    gross_amount: 500,
    fee_amount: 50,
    adjustment_amount: 0,
    net_amount: 450,
    period_start: periodStart1,
    period_end: periodEnd1,
    payout_status: "pending",
    scheduled_payout_at: scheduledPayoutAt2,
    memo: "S1 R1 pending batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payoutS1Completed: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutS1CompletedBody,
      },
    );
  typia.assert(payoutS1Completed);

  const payoutS1Pending: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutS1PendingBody,
      },
    );
  typia.assert(payoutS1Pending);

  // 3-b. Create payouts for seller S2 (conceptual region R2) with different amounts and mixed statuses
  const payoutS2CompletedBody = {
    seller_id: sellerId2,
    currency_code: "USD",
    gross_amount: 2000,
    fee_amount: 200,
    adjustment_amount: 50,
    net_amount: 1850,
    period_start: periodStart2,
    period_end: periodEnd2,
    payout_status: "completed",
    scheduled_payout_at: scheduledPayoutAt1,
    memo: "S2 R2 completed batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payoutS2PendingBody = {
    seller_id: sellerId2,
    currency_code: "USD",
    gross_amount: 800,
    fee_amount: 80,
    adjustment_amount: -20,
    net_amount: 700,
    period_start: periodStart2,
    period_end: periodEnd2,
    payout_status: "pending",
    scheduled_payout_at: scheduledPayoutAt2,
    memo: "S2 R2 pending batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payoutS2Completed: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutS2CompletedBody,
      },
    );
  typia.assert(payoutS2Completed);

  const payoutS2Pending: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutS2PendingBody,
      },
    );
  typia.assert(payoutS2Pending);

  // 4. Call analytics endpoint with a timeRange including all payouts and segmentation by region
  // Compute a conservative time range covering both sellers' periods
  const analyticsTimeRange: IShoppingMallSellerEarningsAnalytics.ITimeRange = {
    start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    end: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
  };

  const analyticsRequestBody = {
    timeRange: analyticsTimeRange,
    compareToPreviousPeriod: false,
    sellerScope: {
      mode: "all",
    },
    segmentations: ["region"],
    orderBy: "totalNetEarnings",
    orderDirection: "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    filters: undefined,
  } satisfies IShoppingMallSellerEarningsAnalytics.IRequest;

  const analytics: IShoppingMallSellerEarningsAnalytics =
    await api.functional.shoppingMall.platformAdmin.analytics.seller_earnings.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(analytics);

  // 5. Validate high-level summary structure and invariants
  TestValidator.predicate(
    "summary totals must be non-negative",
    analytics.summary.totalGmv >= 0 &&
      analytics.summary.totalPlatformFees >= 0 &&
      analytics.summary.totalRefundAmount >= 0 &&
      analytics.summary.totalChargebackAmount >= 0 &&
      analytics.summary.totalNetEarnings >= 0,
  );

  TestValidator.predicate(
    "sellerCount should be at least 1",
    analytics.summary.sellerCount >= 1,
  );

  // 6. Validate segmentation behavior
  TestValidator.predicate(
    "items array should not be empty",
    analytics.items.length > 0,
  );

  const itemsWithSegment = analytics.items.filter(
    (item) => item.segment !== undefined,
  );
  TestValidator.predicate(
    "at least one item should have a segment",
    itemsWithSegment.length > 0,
  );

  // All segments must be dimension === "region"
  const allRegionDimension = itemsWithSegment.every(
    (item) => item.segment?.dimension === "region",
  );
  TestValidator.predicate(
    "all segments should have dimension 'region'",
    allRegionDimension,
  );

  // Collect distinct region codes
  const regionCodes = Array.from(
    new Set(itemsWithSegment.map((item) => item.segment!.code)),
  );

  TestValidator.predicate(
    "there should be at least one region code in analytics",
    regionCodes.length >= 1,
  );

  // 7. Validate payout aggregation sanity per region
  type RegionAggregation = {
    code: string;
    completed: number;
    pending: number;
  };

  const regionAggregations: RegionAggregation[] = regionCodes.map((code) => {
    const regionItems = itemsWithSegment.filter(
      (item) => item.segment!.code === code,
    );
    const completedSum = regionItems.reduce(
      (sum, item) => sum + item.payoutCompletedAmount,
      0,
    );
    const pendingSum = regionItems.reduce(
      (sum, item) => sum + item.payoutPendingAmount,
      0,
    );
    return {
      code,
      completed: completedSum,
      pending: pendingSum,
    };
  });

  // Check non-negativity of sums
  for (const agg of regionAggregations) {
    TestValidator.predicate(
      `region ${agg.code} payout sums must be non-negative`,
      agg.completed >= 0 && agg.pending >= 0,
    );
  }

  // Ensure at least one region has some pending amount (reflecting our mixed statuses)
  const hasPendingRegion = regionAggregations.some((agg) => agg.pending > 0);
  TestValidator.predicate(
    "at least one region should have pending payout amount",
    hasPendingRegion,
  );
}
