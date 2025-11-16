import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutPeriodStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutPeriodStatistics";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import type { IShoppingMallSellerPayoutPeriodStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutPeriodStatistics";

/**
 * Validate seller payout statistics filtering and aggregation by seller.
 *
 * Business goal Ensure that the platform admin statistics endpoint PATCH
 * /shoppingMall/platformAdmin/statistics/seller-payouts-by-period correctly
 * filters aggregated payout buckets by sellerId, and that aggregated
 * netPayoutAmount values match the sums of the underlying seller payouts for
 * each seller independently. Also verify that pagination metadata is coherent
 * with the returned buckets.
 *
 * High-level steps
 *
 * 1. Join a platform admin to obtain an authorized session (SDK manages
 *    Authorization header on connection).
 * 2. Create a guest cart to satisfy dependency context.
 * 3. Create multiple seller payout batches for two synthetic sellers (seller A and
 *    seller B) with deterministic net_amount values and period_start/period_end
 *    within a shared [from, to] window.
 * 4. Query statistics for seller A with granularity "day" and verify that all
 *    buckets belong to seller A and that the aggregated netPayoutAmount equals
 *    the sum of seller A payouts.
 * 5. Query statistics for seller B with the same time window and verify analogous
 *    behavior for seller B.
 * 6. Confirm that seller A and seller B aggregated totals differ, demonstrating
 *    that sellerId filtering isolates each seller’s payouts in aggregation.
 */
export async function test_api_platform_admin_seller_payout_statistics_filtered_by_seller(
  connection: api.IConnection,
) {
  // 1. Join a platform admin (SDK sets Authorization header)
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart (dependency context only)
  const guestCartBody = typia.random<IShoppingMallGuestCart.ICreate>();
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Prepare synthetic seller IDs for A and B
  const sellerAId = typia.random<string & tags.Format<"uuid">>();
  const sellerBId = typia.random<string & tags.Format<"uuid">>();

  // Define a shared [from, to] window around "now"
  const now = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour before
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour after
  const midTime = now.toISOString();

  // 4. Create payouts for seller A with deterministic net_amount values
  const sellerAPayoutInputs = [
    {
      seller_id: sellerAId,
      currency_code: "USD",
      gross_amount: 1000,
      fee_amount: 100,
      adjustment_amount: 0,
      net_amount: 900,
      period_start: from,
      period_end: midTime,
      payout_status: "payout_pending",
      scheduled_payout_at: to,
      memo: "Seller A payout 1",
    } satisfies IShoppingMallSellerPayout.ICreate,
    {
      seller_id: sellerAId,
      currency_code: "USD",
      gross_amount: 500,
      fee_amount: 50,
      adjustment_amount: 0,
      net_amount: 450,
      period_start: midTime,
      period_end: to,
      payout_status: "payout_pending",
      scheduled_payout_at: to,
      memo: "Seller A payout 2",
    } satisfies IShoppingMallSellerPayout.ICreate,
  ];

  const sellerAPayouts: IShoppingMallSellerPayout[] = [];
  for (const body of sellerAPayoutInputs) {
    const payout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body },
      );
    typia.assert(payout);
    sellerAPayouts.push(payout);
  }

  // 5. Create payouts for seller B
  const sellerBPayoutInputs = [
    {
      seller_id: sellerBId,
      currency_code: "USD",
      gross_amount: 700,
      fee_amount: 70,
      adjustment_amount: 0,
      net_amount: 630,
      period_start: from,
      period_end: midTime,
      payout_status: "payout_pending",
      scheduled_payout_at: to,
      memo: "Seller B payout 1",
    } satisfies IShoppingMallSellerPayout.ICreate,
    {
      seller_id: sellerBId,
      currency_code: "USD",
      gross_amount: 300,
      fee_amount: 30,
      adjustment_amount: 0,
      net_amount: 270,
      period_start: midTime,
      period_end: to,
      payout_status: "payout_pending",
      scheduled_payout_at: to,
      memo: "Seller B payout 2",
    } satisfies IShoppingMallSellerPayout.ICreate,
  ];

  const sellerBPayouts: IShoppingMallSellerPayout[] = [];
  for (const body of sellerBPayoutInputs) {
    const payout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body },
      );
    typia.assert(payout);
    sellerBPayouts.push(payout);
  }

  // Helper: sum net_amount from IShoppingMallSellerPayout.ICreate array
  const sumNet = (list: IShoppingMallSellerPayout.ICreate[]): number =>
    list.reduce((acc, cur) => acc + cur.net_amount, 0);

  const sellerANetTotal = sumNet(sellerAPayoutInputs);
  const sellerBNetTotal = sumNet(sellerBPayoutInputs);

  // 6. Query statistics for seller A
  const sellerAStatsReq = {
    from,
    to,
    sellerId: sellerAId,
    granularity: "day" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerPayoutPeriodStatistics.IRequest;

  const sellerAStatsPage: IPageIShoppingMallSellerPayoutPeriodStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.seller_payouts_by_period.index(
      connection,
      {
        body: sellerAStatsReq,
      },
    );
  typia.assert(sellerAStatsPage);

  // All buckets must belong to seller A
  TestValidator.predicate(
    "all seller A buckets have sellerId = sellerAId",
    sellerAStatsPage.data.every((bucket) => bucket.sellerId === sellerAId),
  );

  const sellerANetFromBuckets = sellerAStatsPage.data.reduce(
    (acc, bucket) => acc + bucket.netPayoutAmount,
    0,
  );

  TestValidator.equals(
    "seller A net payout aggregation matches created payouts",
    sellerANetFromBuckets,
    sellerANetTotal,
  );

  // Basic pagination checks for seller A
  const pagA = sellerAStatsPage.pagination;
  TestValidator.predicate(
    "seller A pagination current is non-negative",
    pagA.current >= 0,
  );
  TestValidator.equals(
    "seller A pagination limit matches request",
    pagA.limit,
    sellerAStatsReq.limit,
  );
  TestValidator.predicate(
    "seller A pagination records is at least data length",
    pagA.records >= sellerAStatsPage.data.length,
  );

  // 7. Query statistics for seller B
  const sellerBStatsReq = {
    from,
    to,
    sellerId: sellerBId,
    granularity: "day" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerPayoutPeriodStatistics.IRequest;

  const sellerBStatsPage: IPageIShoppingMallSellerPayoutPeriodStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.seller_payouts_by_period.index(
      connection,
      {
        body: sellerBStatsReq,
      },
    );
  typia.assert(sellerBStatsPage);

  // All buckets must belong to seller B
  TestValidator.predicate(
    "all seller B buckets have sellerId = sellerBId",
    sellerBStatsPage.data.every((bucket) => bucket.sellerId === sellerBId),
  );

  const sellerBNetFromBuckets = sellerBStatsPage.data.reduce(
    (acc, bucket) => acc + bucket.netPayoutAmount,
    0,
  );

  TestValidator.equals(
    "seller B net payout aggregation matches created payouts",
    sellerBNetFromBuckets,
    sellerBNetTotal,
  );

  const pagB = sellerBStatsPage.pagination;
  TestValidator.predicate(
    "seller B pagination current is non-negative",
    pagB.current >= 0,
  );
  TestValidator.equals(
    "seller B pagination limit matches request",
    pagB.limit,
    sellerBStatsReq.limit,
  );
  TestValidator.predicate(
    "seller B pagination records is at least data length",
    pagB.records >= sellerBStatsPage.data.length,
  );

  // 8. Cross-check that seller A and B totals differ to ensure filtering works
  TestValidator.notEquals(
    "seller A and B aggregated net payouts differ",
    sellerANetFromBuckets,
    sellerBNetFromBuckets,
  );
}
