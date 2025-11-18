import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOverviewDashboard";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_dashboard_overview_reviews_and_performance_alignment(
  connection: api.IConnection,
) {
  // 1. Seller joins (authentication setup)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  // Validate the authorized seller structure
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Ensure that the connection now carries an Authorization header implicitly
  // (we cannot touch connection.headers, but we indirectly verify by calling
  // an authenticated-only endpoint and expecting success).

  // 2. First dashboard call
  const dashboard1: IShoppingMallSellerOverviewDashboard =
    await api.functional.shoppingMall.seller.dashboard.sellerOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSellerOverviewDashboard>(dashboard1);

  // Basic seller identity alignment
  TestValidator.equals(
    "sellerId in dashboard must match authenticated seller.id",
    dashboard1.seller.sellerId,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "seller email in dashboard should match authorized seller email",
    dashboard1.seller.email,
    authorizedSeller.email,
  );

  // 3. KPI sanity checks
  const kpis1 = dashboard1.kpis;
  TestValidator.predicate(
    "openOrderCount should be non-negative",
    kpis1.openOrderCount >= 0,
  );
  TestValidator.predicate(
    "completedOrderCountLast30Days should be non-negative",
    kpis1.completedOrderCountLast30Days >= 0,
  );
  TestValidator.predicate(
    "activeSkuCount should be non-negative",
    kpis1.activeSkuCount >= 0,
  );

  // 4. Orders section sanity checks
  const orders1 = dashboard1.orders;
  TestValidator.predicate(
    "openOrdersByStatus should not contain negative counts",
    orders1.openOrdersByStatus.every((bucket) => bucket.count >= 0),
  );
  TestValidator.predicate(
    "recentOrders should have non-empty orderId and orderCode",
    orders1.recentOrders.every(
      (o) => o.orderId.length > 0 && o.orderCode.length > 0,
    ),
  );

  // 5. Payouts section sanity checks
  const payouts1 = dashboard1.payouts;
  TestValidator.predicate(
    "totalNetEarnings should be non-negative",
    payouts1.totalNetEarnings >= 0,
  );
  TestValidator.predicate(
    "pendingPayoutAmount should be non-negative",
    payouts1.pendingPayoutAmount >= 0,
  );
  TestValidator.predicate(
    "lastPayoutAmount should be non-negative",
    payouts1.lastPayoutAmount >= 0,
  );

  // 6. Inventory alerts sanity
  const inventory1 = dashboard1.inventoryAlerts;
  TestValidator.predicate(
    "lowStockSkuCount should be non-negative",
    inventory1.lowStockSkuCount >= 0,
  );
  TestValidator.predicate(
    "outOfStockSkuCount should be non-negative",
    inventory1.outOfStockSkuCount >= 0,
  );
  TestValidator.predicate(
    "highlightSkus should have consistent stock quantities",
    inventory1.highlightSkus.every((sku) => sku.currentStockQuantity >= 0),
  );

  // 7. Reviews section consistency
  const reviews1 = dashboard1.reviews;
  const totalReviewCount = reviews1.reviewCount;

  TestValidator.predicate(
    "reviewCount should be non-negative",
    totalReviewCount >= 0,
  );

  const sumBucketCounts = reviews1.ratingDistribution
    .map((bucket) => bucket.count)
    .reduce((a, b) => a + b, 0);

  TestValidator.equals(
    "sum of ratingDistribution counts must equal reviewCount",
    sumBucketCounts,
    totalReviewCount,
  );

  TestValidator.predicate(
    "ratingDistribution ratings should be positive integers",
    reviews1.ratingDistribution.every((bucket) => bucket.rating > 0),
  );

  TestValidator.predicate(
    "ratingDistribution counts should be non-negative",
    reviews1.ratingDistribution.every((bucket) => bucket.count >= 0),
  );

  if (totalReviewCount > 0) {
    TestValidator.predicate(
      "averageRating should be within 0 to 5 when there are reviews",
      reviews1.averageRating >= 0 && reviews1.averageRating <= 5,
    );

    TestValidator.predicate(
      "recentReviews length must not exceed total reviewCount",
      reviews1.recentReviews.length <= totalReviewCount,
    );

    // Every recent review rating should correspond to a rating bucket
    const ratingValues = reviews1.ratingDistribution.map(
      (bucket) => bucket.rating,
    );
    TestValidator.predicate(
      "recentReviews ratings must be part of ratingDistribution ratings",
      reviews1.recentReviews.every((review) =>
        ratingValues.includes(review.rating),
      ),
    );

    TestValidator.predicate(
      "recentReviews should have non-empty productName and excerpt",
      reviews1.recentReviews.every(
        (r) => r.productName.length > 0 && r.excerpt.length > 0,
      ),
    );
  }

  // 8. Performance section sanity
  const perf1 = dashboard1.performance;
  TestValidator.predicate(
    "orderDefectRate should be between 0 and 1",
    perf1.orderDefectRate >= 0 && perf1.orderDefectRate <= 1,
  );
  TestValidator.predicate(
    "refundRate should be between 0 and 1",
    perf1.refundRate >= 0 && perf1.refundRate <= 1,
  );
  TestValidator.predicate(
    "cancellationRate should be between 0 and 1",
    perf1.cancellationRate >= 0 && perf1.cancellationRate <= 1,
  );
  TestValidator.predicate(
    "lateShipmentRate should be between 0 and 1",
    perf1.lateShipmentRate >= 0 && perf1.lateShipmentRate <= 1,
  );
  TestValidator.predicate(
    "disputeOpenCount should be non-negative",
    perf1.disputeOpenCount >= 0,
  );

  // 9. Idempotency / stability: second dashboard call
  const dashboard2: IShoppingMallSellerOverviewDashboard =
    await api.functional.shoppingMall.seller.dashboard.sellerOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSellerOverviewDashboard>(dashboard2);

  // Basic identity fields should remain stable
  TestValidator.equals(
    "sellerId must remain stable between dashboard calls",
    dashboard2.seller.sellerId,
    dashboard1.seller.sellerId,
  );
  TestValidator.equals(
    "seller email must remain stable between dashboard calls",
    dashboard2.seller.email,
    dashboard1.seller.email,
  );
  TestValidator.equals(
    "seller status must remain stable between dashboard calls",
    dashboard2.seller.status,
    dashboard1.seller.status,
  );
  TestValidator.equals(
    "seller storeName must remain stable between dashboard calls",
    dashboard2.seller.storeName,
    dashboard1.seller.storeName,
  );

  // Review metrics should be consistent between immediate consecutive calls
  TestValidator.equals(
    "reviewCount should remain consistent between immediate dashboard calls",
    dashboard2.reviews.reviewCount,
    dashboard1.reviews.reviewCount,
  );
  TestValidator.equals(
    "ratingDistribution length should remain consistent",
    dashboard2.reviews.ratingDistribution.length,
    dashboard1.reviews.ratingDistribution.length,
  );
}
