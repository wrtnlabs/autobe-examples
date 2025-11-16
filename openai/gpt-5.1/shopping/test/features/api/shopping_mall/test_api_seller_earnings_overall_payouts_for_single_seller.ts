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

export async function test_api_seller_earnings_overall_payouts_for_single_seller(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to gain access to admin-only endpoints
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart to simulate unrelated guest activity
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shop.test.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create a seller payout batch for a single seller
  // For testing, we rely on existing seller data in the system. We choose
  // a stable UUID-shaped value for seller_id, trusting backend validation
  // and fixtures. If the backend requires a real seller, the test
  // environment should seed one matching this id.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const periodStart = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const periodEnd = now.toISOString();

  const grossAmount = 100000;
  const feeAmount = 10000;
  const adjustmentAmount = 0;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: "KRW",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart,
    period_end: periodEnd,
    payout_status: "completed",
    scheduled_payout_at: scheduledAt,
    memo: "Single seller payout batch for analytics test",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(payout);

  // 4. Invoke seller earnings analytics for the payout's seller
  // Build a time range that includes the scheduled payout time
  const timeRange: IShoppingMallSellerEarningsAnalytics.ITimeRange = {
    start: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const sellerScope: IShoppingMallSellerEarningsAnalytics.ISellerScope = {
    mode: "byIds",
    sellerIds: [payout.sellerId],
  };

  const filters: IShoppingMallSellerEarningsAnalytics.IFilters = {
    payoutStatus: "completed",
  };

  const analyticsBody = {
    timeRange,
    compareToPreviousPeriod: false,
    sellerScope,
    segmentations: [],
    orderBy: "netEarnings",
    orderDirection: "desc",
    page: 1,
    limit: 10,
    filters,
  } satisfies IShoppingMallSellerEarningsAnalytics.IRequest;

  const analytics: IShoppingMallSellerEarningsAnalytics =
    await api.functional.shoppingMall.platformAdmin.analytics.seller_earnings.index(
      connection,
      {
        body: analyticsBody,
      },
    );
  typia.assert(analytics);

  // 5. Validate analytics response structure and key business expectations
  const summary = analytics.summary;
  const items = analytics.items;

  TestValidator.predicate(
    "sellerCount should be at least 1",
    summary.sellerCount >= 1,
  );

  TestValidator.predicate("items array should not be empty", items.length >= 1);

  // Find the item corresponding to our payout seller
  const targetItem = items.find((item) => item.seller.id === payout.sellerId);

  TestValidator.predicate(
    "analytics should include the target seller",
    !!targetItem,
  );

  if (!targetItem) return;

  // payoutCompletedAmount should be non-negative and at least the net payout
  TestValidator.predicate(
    "payoutCompletedAmount should be >= netAmount",
    targetItem.payoutCompletedAmount >= netAmount,
  );

  TestValidator.predicate(
    "payoutPendingAmount should be non-negative",
    targetItem.payoutPendingAmount >= 0,
  );

  // Because we filtered by completed payouts, pending amount for this
  // single seller should reasonably be 0 in a clean test environment.
  TestValidator.predicate(
    "payoutPendingAmount should be 0 for completed-only filter",
    targetItem.payoutPendingAmount === 0,
  );

  // Refund and chargeback rates are expected to be zero in this simple scenario
  TestValidator.predicate(
    "refundRate should be zero in simple payout-only scenario",
    targetItem.refundRate === 0,
  );

  TestValidator.predicate(
    "chargebackRate should be zero in simple payout-only scenario",
    targetItem.chargebackRate === 0,
  );

  // Summary should reflect non-negative totals and at least as large as the
  // target seller's net earnings.
  TestValidator.predicate(
    "summary.totalNetEarnings should be non-negative",
    summary.totalNetEarnings >= 0,
  );

  TestValidator.predicate(
    "summary.totalNetEarnings should be >= target seller netEarnings",
    summary.totalNetEarnings >= targetItem.netEarnings,
  );
}
