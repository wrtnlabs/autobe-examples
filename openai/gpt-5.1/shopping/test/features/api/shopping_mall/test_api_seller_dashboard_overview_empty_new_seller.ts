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
 * Validate seller overview dashboard for a brand-new seller.
 *
 * Business goal
 *
 * - Ensure that when a seller has just joined the platform and has performed no
 *   commercial activity yet, the seller dashboard still returns a fully
 *   populated, consistent overview object rather than failing or returning
 *   garbage values.
 * - Confirm that all KPIs and sections reflect the "empty state" semantics for a
 *   new seller: numeric metrics are zero, collections are empty, and string
 *   values are present where required but neutral.
 *
 * Test flow
 *
 * 1. Register a new seller with POST /auth/seller/join
 *
 *    - Use IShoppingMallSellerAuthJoin.IRequest for the body
 *    - Rely on SDK to set Authorization header via returned token
 *    - Capture the returned IShoppingMallSeller.IAuthorized payload
 * 2. Immediately call GET /shoppingMall/seller/dashboard/sellerOverview as that
 *    seller
 *
 *    - Use api.functional.shoppingMall.seller.dashboard.sellerOverview.at
 *    - Assert the response matches IShoppingMallSellerOverviewDashboard via
 *         typia.assert
 * 3. Validate seller summary section
 *
 *    - Seller.sellerId === authorized.id
 *    - Seller.email === authorized.email
 *    - Seller.status is a non-empty string
 * 4. Validate KPI section represents zero activity
 *
 *    - Kpis.totalSalesToday === 0
 *    - Kpis.totalSalesLast7Days === 0
 *    - Kpis.totalSalesLast30Days === 0
 *    - Kpis.openOrderCount === 0
 *    - Kpis.completedOrderCountLast30Days === 0
 *    - Kpis.activeSkuCount === 0
 * 5. Validate order section empty state
 *
 *    - Orders.openOrdersByStatus.length === 0
 *    - Orders.recentOrders.length === 0
 * 6. Validate payout section empty/initial state
 *
 *    - Payouts.totalNetEarnings === 0
 *    - Payouts.pendingPayoutAmount === 0
 *    - Payouts.lastPayoutAmount === 0
 *    - LastPayoutDate is structurally valid (date-time) via typia.assert
 * 7. Validate inventory alert section empty state
 *
 *    - InventoryAlerts.lowStockSkuCount === 0
 *    - InventoryAlerts.outOfStockSkuCount === 0
 *    - InventoryAlerts.highlightSkus.length === 0
 * 8. Validate review section empty state
 *
 *    - Reviews.reviewCount === 0
 *    - Reviews.averageRating === 0
 *    - Reviews.ratingDistribution.length === 0
 *    - Reviews.recentReviews.length === 0
 * 9. Validate performance section neutral state
 *
 *    - Performance.orderDefectRate === 0
 *    - Performance.refundRate === 0
 *    - Performance.cancellationRate === 0
 *    - Performance.lateShipmentRate === 0
 *    - Performance.disputeOpenCount === 0
 *    - Performance.tier is a non-empty string
 */
export async function test_api_seller_dashboard_overview_empty_new_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller (join)
  const joinRequest = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. Fetch seller overview dashboard
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.sellerOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSellerOverviewDashboard>(dashboard);

  // 3. Validate seller summary section
  TestValidator.equals(
    "seller summary sellerId matches authorized id",
    dashboard.seller.sellerId,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "seller summary email matches authorized email",
    dashboard.seller.email,
    authorizedSeller.email,
  );
  TestValidator.predicate(
    "seller status should be non-empty string for new seller",
    dashboard.seller.status.length > 0,
  );

  // 4. Validate KPI section represents zero activity
  TestValidator.equals(
    "kpis.totalSalesToday is zero for new seller",
    dashboard.kpis.totalSalesToday,
    0,
  );
  TestValidator.equals(
    "kpis.totalSalesLast7Days is zero for new seller",
    dashboard.kpis.totalSalesLast7Days,
    0,
  );
  TestValidator.equals(
    "kpis.totalSalesLast30Days is zero for new seller",
    dashboard.kpis.totalSalesLast30Days,
    0,
  );
  TestValidator.equals(
    "kpis.openOrderCount is zero for new seller",
    dashboard.kpis.openOrderCount,
    0,
  );
  TestValidator.equals(
    "kpis.completedOrderCountLast30Days is zero for new seller",
    dashboard.kpis.completedOrderCountLast30Days,
    0,
  );
  TestValidator.equals(
    "kpis.activeSkuCount is zero for new seller",
    dashboard.kpis.activeSkuCount,
    0,
  );

  // 5. Validate order section empty state
  TestValidator.equals(
    "orders.openOrdersByStatus is empty for new seller",
    dashboard.orders.openOrdersByStatus.length,
    0,
  );
  TestValidator.equals(
    "orders.recentOrders is empty for new seller",
    dashboard.orders.recentOrders.length,
    0,
  );

  // 6. Validate payout section empty/initial state
  TestValidator.equals(
    "payouts.totalNetEarnings is zero for new seller",
    dashboard.payouts.totalNetEarnings,
    0,
  );
  TestValidator.equals(
    "payouts.pendingPayoutAmount is zero for new seller",
    dashboard.payouts.pendingPayoutAmount,
    0,
  );
  TestValidator.equals(
    "payouts.lastPayoutAmount is zero for new seller",
    dashboard.payouts.lastPayoutAmount,
    0,
  );
  // lastPayoutDate already validated structurally by typia.assert

  // 7. Validate inventory alert section empty state
  TestValidator.equals(
    "inventoryAlerts.lowStockSkuCount is zero for new seller",
    dashboard.inventoryAlerts.lowStockSkuCount,
    0,
  );
  TestValidator.equals(
    "inventoryAlerts.outOfStockSkuCount is zero for new seller",
    dashboard.inventoryAlerts.outOfStockSkuCount,
    0,
  );
  TestValidator.equals(
    "inventoryAlerts.highlightSkus is empty for new seller",
    dashboard.inventoryAlerts.highlightSkus.length,
    0,
  );

  // 8. Validate review section empty state
  TestValidator.equals(
    "reviews.reviewCount is zero for new seller",
    dashboard.reviews.reviewCount,
    0,
  );
  TestValidator.equals(
    "reviews.averageRating is zero for new seller",
    dashboard.reviews.averageRating,
    0,
  );
  TestValidator.equals(
    "reviews.ratingDistribution is empty for new seller",
    dashboard.reviews.ratingDistribution.length,
    0,
  );
  TestValidator.equals(
    "reviews.recentReviews is empty for new seller",
    dashboard.reviews.recentReviews.length,
    0,
  );

  // 9. Validate performance section neutral state
  TestValidator.equals(
    "performance.orderDefectRate is zero for new seller",
    dashboard.performance.orderDefectRate,
    0,
  );
  TestValidator.equals(
    "performance.refundRate is zero for new seller",
    dashboard.performance.refundRate,
    0,
  );
  TestValidator.equals(
    "performance.cancellationRate is zero for new seller",
    dashboard.performance.cancellationRate,
    0,
  );
  TestValidator.equals(
    "performance.lateShipmentRate is zero for new seller",
    dashboard.performance.lateShipmentRate,
    0,
  );
  TestValidator.equals(
    "performance.disputeOpenCount is zero for new seller",
    dashboard.performance.disputeOpenCount,
    0,
  );
  TestValidator.predicate(
    "performance tier is a non-empty string for new seller",
    dashboard.performance.tier.length > 0,
  );
}
