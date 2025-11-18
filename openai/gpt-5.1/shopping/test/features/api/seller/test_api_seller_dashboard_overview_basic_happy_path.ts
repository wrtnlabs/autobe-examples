import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOverviewDashboard";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that an authenticated seller can retrieve a consolidated dashboard
 * overview after registration, and that the response is structurally sound and
 * internally consistent with the seller identity.
 *
 * Business flow exercised (simplified from the original scenario due to
 * available APIs):
 *
 * 1. Seller self-registers via POST /auth/seller/join.
 *
 *    - Generates realistic join payload (email, password, href, referrer) using
 *         typia tags and RandomGenerator helpers.
 *    - Receives an IShoppingMallSeller.IAuthorized response with authorization
 *         token.
 *    - SDK side-effect sets connection.headers.Authorization, so all subsequent
 *         calls operate under this seller context.
 * 2. Authenticated seller calls GET /shoppingMall/seller/dashboard/sellerOverview.
 *
 *    - Expects a single IShoppingMallSellerOverviewDashboard object.
 *    - The dashboard aggregates data about KPIs, orders, payouts, inventory alerts,
 *         reviews, and performance statistics for this seller.
 * 3. Validate core invariants:
 *
 *    - Response type fully matches IShoppingMallSellerOverviewDashboard
 *         (typia.assert).
 *    - Seller header section is consistent with join: seller.email equals the joined
 *         email and sellerId is a UUID.
 *    - KPI numeric fields are non-negative.
 *    - Order section counts are non-negative; IDs and date-times exist and follow
 *         expected formats.
 *    - Payout totals and inventory alert counts are non-negative.
 *    - Review counts, rating buckets, and recent review entries are structurally
 *         valid and non-negative.
 *    - Performance rates lie in [0, 1] range and disputeOpenCount is non-negative.
 *
 * Note: We do not explicitly create catalog SKUs, orders, payouts, or reviews
 * because such APIs are not part of this test fixture. Instead, we rely on the
 * server/simulator to provide coherent aggregates and focus our checks on
 * structural correctness and high-level invariants rather than exact numeric
 * relationships to synthetic underlying data.
 */
export async function test_api_seller_dashboard_overview_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration + initial authentication)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const password: string & tags.Format<"password"> =
    (RandomGenerator.alphaNumeric(16) + "Aa1!") as string &
      tags.Format<"password">;

  const href: string & tags.Format<"uri"> =
    "https://seller-portal.example.com/onboarding" as string &
      tags.Format<"uri">;

  const referrer: string & tags.Format<"uri"> =
    "https://landing.example.com/campaign" as string & tags.Format<"uri">;

  const joinRequest = {
    email,
    password,
    href,
    referrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  TestValidator.equals(
    "joined seller email should echo request email",
    seller.email,
    email,
  );

  TestValidator.predicate(
    "seller id should be a non-empty string",
    typeof seller.id === "string" && seller.id.length > 0,
  );

  // 2. Fetch seller dashboard overview as the authenticated seller
  const dashboard: IShoppingMallSellerOverviewDashboard =
    await api.functional.shoppingMall.seller.dashboard.sellerOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSellerOverviewDashboard>(dashboard);

  // 3. Validate seller summary consistency
  const summary = dashboard.seller;

  TestValidator.equals(
    "dashboard seller email matches joined email",
    summary.email,
    email,
  );

  TestValidator.predicate(
    "seller summary id is non-empty UUID-like string",
    typeof summary.sellerId === "string" && summary.sellerId.length > 0,
  );

  TestValidator.predicate(
    "seller storeName is non-empty",
    typeof summary.storeName === "string" && summary.storeName.length > 0,
  );

  TestValidator.predicate(
    "seller status is non-empty",
    typeof summary.status === "string" && summary.status.length > 0,
  );

  // 4. KPI non-negativity checks
  const kpis = dashboard.kpis;

  TestValidator.predicate(
    "totalSalesToday is non-negative",
    kpis.totalSalesToday >= 0,
  );
  TestValidator.predicate(
    "totalSalesLast7Days is non-negative",
    kpis.totalSalesLast7Days >= 0,
  );
  TestValidator.predicate(
    "totalSalesLast30Days is non-negative",
    kpis.totalSalesLast30Days >= 0,
  );
  TestValidator.predicate(
    "openOrderCount is non-negative",
    kpis.openOrderCount >= 0,
  );
  TestValidator.predicate(
    "completedOrderCountLast30Days is non-negative",
    kpis.completedOrderCountLast30Days >= 0,
  );
  TestValidator.predicate(
    "activeSkuCount is non-negative",
    kpis.activeSkuCount >= 0,
  );

  // 5. Orders section structure and non-negativity
  const orders = dashboard.orders;

  await ArrayUtil.asyncForEach(
    orders.openOrdersByStatus,
    async (bucket, index) => {
      TestValidator.predicate(
        `openOrdersByStatus[${index}] has non-empty status`,
        typeof bucket.status === "string" && bucket.status.length > 0,
      );
      TestValidator.predicate(
        `openOrdersByStatus[${index}] count is non-negative`,
        bucket.count >= 0,
      );
    },
  );

  await ArrayUtil.asyncForEach(orders.recentOrders, async (order, index) => {
    TestValidator.predicate(
      `recentOrders[${index}] orderId is non-empty UUID-like string`,
      typeof order.orderId === "string" && order.orderId.length > 0,
    );
    TestValidator.predicate(
      `recentOrders[${index}] orderCode is non-empty`,
      typeof order.orderCode === "string" && order.orderCode.length > 0,
    );
    TestValidator.predicate(
      `recentOrders[${index}] grandTotalAmount is non-negative`,
      order.grandTotalAmount >= 0,
    );
  });

  // 6. Payout section non-negativity
  const payouts = dashboard.payouts;

  TestValidator.predicate(
    "totalNetEarnings is non-negative",
    payouts.totalNetEarnings >= 0,
  );
  TestValidator.predicate(
    "pendingPayoutAmount is non-negative",
    payouts.pendingPayoutAmount >= 0,
  );
  TestValidator.predicate(
    "lastPayoutAmount is non-negative",
    payouts.lastPayoutAmount >= 0,
  );

  // 7. Inventory alerts section checks
  const inventory = dashboard.inventoryAlerts;

  TestValidator.predicate(
    "lowStockSkuCount is non-negative",
    inventory.lowStockSkuCount >= 0,
  );
  TestValidator.predicate(
    "outOfStockSkuCount is non-negative",
    inventory.outOfStockSkuCount >= 0,
  );

  await ArrayUtil.asyncForEach(inventory.highlightSkus, async (sku, index) => {
    TestValidator.predicate(
      `highlightSkus[${index}] skuId is non-empty UUID-like string`,
      typeof sku.skuId === "string" && sku.skuId.length > 0,
    );
    TestValidator.predicate(
      `highlightSkus[${index}] skuCode is non-empty`,
      typeof sku.skuCode === "string" && sku.skuCode.length > 0,
    );
    TestValidator.predicate(
      `highlightSkus[${index}] productName is non-empty`,
      typeof sku.productName === "string" && sku.productName.length > 0,
    );
    TestValidator.predicate(
      `highlightSkus[${index}] currentStockQuantity is non-negative`,
      sku.currentStockQuantity >= 0,
    );
  });

  // 8. Review section checks
  const reviews = dashboard.reviews;

  TestValidator.predicate(
    "averageRating is non-negative",
    reviews.averageRating >= 0,
  );
  TestValidator.predicate(
    "reviewCount is non-negative",
    reviews.reviewCount >= 0,
  );

  await ArrayUtil.asyncForEach(
    reviews.ratingDistribution,
    async (bucket, index) => {
      TestValidator.predicate(
        `ratingDistribution[${index}] rating is non-negative int`,
        bucket.rating >= 0,
      );
      TestValidator.predicate(
        `ratingDistribution[${index}] count is non-negative`,
        bucket.count >= 0,
      );
    },
  );

  await ArrayUtil.asyncForEach(reviews.recentReviews, async (review, index) => {
    TestValidator.predicate(
      `recentReviews[${index}] reviewId is non-empty UUID-like string`,
      typeof review.reviewId === "string" && review.reviewId.length > 0,
    );
    TestValidator.predicate(
      `recentReviews[${index}] productName is non-empty`,
      typeof review.productName === "string" && review.productName.length > 0,
    );
    TestValidator.predicate(
      `recentReviews[${index}] rating is non-negative int`,
      review.rating >= 0,
    );
    TestValidator.predicate(
      `recentReviews[${index}] excerpt is non-empty`,
      typeof review.excerpt === "string" && review.excerpt.length > 0,
    );
  });

  // 9. Performance section checks
  const perf = dashboard.performance;

  TestValidator.predicate(
    "orderDefectRate is within [0, 1]",
    perf.orderDefectRate >= 0 && perf.orderDefectRate <= 1,
  );
  TestValidator.predicate(
    "refundRate is within [0, 1]",
    perf.refundRate >= 0 && perf.refundRate <= 1,
  );
  TestValidator.predicate(
    "cancellationRate is within [0, 1]",
    perf.cancellationRate >= 0 && perf.cancellationRate <= 1,
  );
  TestValidator.predicate(
    "lateShipmentRate is within [0, 1]",
    perf.lateShipmentRate >= 0 && perf.lateShipmentRate <= 1,
  );
  TestValidator.predicate(
    "disputeOpenCount is non-negative",
    perf.disputeOpenCount >= 0,
  );
  TestValidator.predicate(
    "tier is a string (possibly empty)",
    typeof perf.tier === "string",
  );
}
