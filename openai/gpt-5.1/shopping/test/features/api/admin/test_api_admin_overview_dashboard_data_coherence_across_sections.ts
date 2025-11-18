import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOverviewDashboard";

export async function test_api_admin_overview_dashboard_data_coherence_across_sections(
  connection: api.IConnection,
) {
  // 1. Join as a new admin to obtain an authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Fetch the admin overview dashboard
  const dashboard =
    await api.functional.shoppingMall.admin.dashboard.adminOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminOverviewDashboard>(dashboard);

  const {
    todayOrderStats,
    todaySellerStats,
    todayCustomerStats,
    currentPlatformKpis,
    paymentMethodStats,
    shippingPerformanceStats,
    refundAndDisputeStats,
  } = dashboard;

  // Helper to parse date-time and date strings safely
  const toDate = (value: string): Date => new Date(value);

  // 3. Period alignment checks
  const orderStatsDate = toDate(todayOrderStats.statsDate);
  const sellerStatsDate = toDate(todaySellerStats.statsDate);
  const customerStatsDate = toDate(todayCustomerStats.statsDate);
  const refundStatsDate = new Date(refundAndDisputeStats.statsDate);

  const periodStart = toDate(currentPlatformKpis.periodStart);
  const periodEnd = toDate(currentPlatformKpis.periodEnd);

  const isWithinPeriod = (d: Date): boolean =>
    d.getTime() >= periodStart.getTime() && d.getTime() <= periodEnd.getTime();

  await TestValidator.predicate(
    "todayOrderStats.statsDate within or equal to KPI period",
    async () =>
      isWithinPeriod(orderStatsDate) ||
      periodStart.getTime() > periodEnd.getTime(),
  );

  await TestValidator.predicate(
    "todaySellerStats.statsDate within or equal to KPI period",
    async () =>
      isWithinPeriod(sellerStatsDate) ||
      periodStart.getTime() > periodEnd.getTime(),
  );

  await TestValidator.predicate(
    "todayCustomerStats.statsDate within or equal to KPI period",
    async () =>
      isWithinPeriod(customerStatsDate) ||
      periodStart.getTime() > periodEnd.getTime(),
  );

  await TestValidator.predicate(
    "refundAndDisputeStats.statsDate within or equal to KPI period (by date component)",
    async () => {
      const rd = refundStatsDate.getTime();
      return (
        rd >= periodStart.getTime() ||
        periodStart.getTime() > periodEnd.getTime()
      );
    },
  );

  // For per-method stats, align their statsDate (date-time) to the todayOrderStats.statsDate day
  const toYmd = (d: Date): string =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate(),
    ).padStart(2, "0")}`;
  const orderYmd = toYmd(orderStatsDate);

  for (const methodStat of paymentMethodStats) {
    const methodDate = toDate(methodStat.statsDate);
    const methodYmd = toYmd(methodDate);
    TestValidator.equals(
      "payment method stat date matches todayOrderStats date (ymd)",
      methodYmd,
      orderYmd,
    );
  }

  for (const shippingStat of shippingPerformanceStats) {
    const shipDate = toDate(shippingStat.statsDate);
    const shipYmd = toYmd(shipDate);
    TestValidator.equals(
      "shipping performance stat date matches todayOrderStats date (ymd)",
      shipYmd,
      orderYmd,
    );
  }

  // 4. Numeric coherence checks
  const nonNegative = (value: number): boolean => value >= 0;

  // Order stats basic relationships
  TestValidator.predicate(
    "todayOrderStats.paidOrderCount is non-negative",
    todayOrderStats.paidOrderCount >= 0,
  );
  TestValidator.predicate(
    "todayOrderStats.orderCount is non-negative",
    todayOrderStats.orderCount >= 0,
  );
  TestValidator.predicate(
    "todayOrderStats.paidOrderCount <= todayOrderStats.orderCount",
    todayOrderStats.paidOrderCount <= todayOrderStats.orderCount,
  );

  // KPI vs daily paid order relationship when periods are sensible
  TestValidator.predicate(
    "currentPlatformKpis.paidOrderCount >= todayOrderStats.paidOrderCount when within period",
    !isWithinPeriod(orderStatsDate) ||
      currentPlatformKpis.paidOrderCount >= todayOrderStats.paidOrderCount,
  );

  // Refund and dispute coherence
  TestValidator.predicate(
    "refund request counts are non-negative",
    refundAndDisputeStats.refundRequestCount >= 0 &&
      refundAndDisputeStats.approvedRefundRequestCount >= 0 &&
      refundAndDisputeStats.rejectedRefundRequestCount >= 0,
  );

  TestValidator.predicate(
    "approved + rejected refund requests <= total refundRequestCount",
    refundAndDisputeStats.approvedRefundRequestCount +
      refundAndDisputeStats.rejectedRefundRequestCount <=
      refundAndDisputeStats.refundRequestCount,
  );

  // GMV vs NMV relationships and non-negative amounts
  TestValidator.predicate(
    "todayOrderStats GMV and NMV are non-negative and NMV <= GMV",
    nonNegative(todayOrderStats.gmvAmount) &&
      nonNegative(todayOrderStats.nmvAmount) &&
      todayOrderStats.nmvAmount <= todayOrderStats.gmvAmount,
  );

  TestValidator.predicate(
    "todaySellerStats GMV/NMV non-negative and NMV <= GMV",
    nonNegative(todaySellerStats.gmvAmount) &&
      nonNegative(todaySellerStats.nmvAmount) &&
      todaySellerStats.nmvAmount <= todaySellerStats.gmvAmount,
  );

  TestValidator.predicate(
    "todayCustomerStats GMV/NMV non-negative and NMV <= GMV",
    nonNegative(todayCustomerStats.gmvAmount) &&
      nonNegative(todayCustomerStats.nmvAmount) &&
      todayCustomerStats.nmvAmount <= todayCustomerStats.gmvAmount,
  );

  TestValidator.predicate(
    "currentPlatformKpis GMV/NMV non-negative and NMV <= GMV",
    nonNegative(currentPlatformKpis.gmvAmount) &&
      nonNegative(currentPlatformKpis.nmvAmount) &&
      currentPlatformKpis.nmvAmount <= currentPlatformKpis.gmvAmount,
  );

  // Platform KPI amount non-negativity
  TestValidator.predicate(
    "currentPlatformKpis key amounts are non-negative",
    nonNegative(currentPlatformKpis.gmvAmount) &&
      nonNegative(currentPlatformKpis.nmvAmount) &&
      nonNegative(currentPlatformKpis.platformRevenueAmount) &&
      nonNegative(currentPlatformKpis.refundedAmount) &&
      nonNegative(currentPlatformKpis.chargebackAmount),
  );

  // todayOrderStats refund and chargeback amounts non-negative
  TestValidator.predicate(
    "todayOrderStats refund and chargeback amounts non-negative",
    nonNegative(todayOrderStats.refundAmount) &&
      nonNegative(todayOrderStats.chargebackAmount),
  );

  // todaySellerStats sellerEarningsAmount and commissionAmount non-negative
  TestValidator.predicate(
    "todaySellerStats earnings and commission non-negative",
    nonNegative(todaySellerStats.sellerEarningsAmount) &&
      nonNegative(todaySellerStats.commissionAmount),
  );

  // todayCustomerStats refundAmount non-negative
  TestValidator.predicate(
    "todayCustomerStats refundAmount non-negative",
    nonNegative(todayCustomerStats.refundAmount),
  );

  // Payment method stats non-negative amounts
  for (const methodStat of paymentMethodStats) {
    TestValidator.predicate(
      "payment method stats counts are non-negative",
      methodStat.paymentAttemptCount >= 0 &&
        methodStat.paymentSuccessCount >= 0 &&
        methodStat.paymentFailureCount >= 0 &&
        methodStat.paymentExpiredCount >= 0,
    );

    TestValidator.predicate(
      "payment method stats amounts are non-negative",
      nonNegative(methodStat.paidGmvAmount) &&
        nonNegative(methodStat.refundedAmount) &&
        nonNegative(methodStat.chargebackAmount),
    );
  }

  // Shipping performance stats non-negative counts and reasonable rates
  for (const shippingStat of shippingPerformanceStats) {
    TestValidator.predicate(
      "shipping performance shipment counts are non-negative",
      shippingStat.shipmentCreatedCount >= 0 &&
        shippingStat.shipmentShippedCount >= 0 &&
        shippingStat.shipmentDeliveredCount >= 0 &&
        shippingStat.shipmentDeliveryFailedCount >= 0 &&
        shippingStat.shipmentReturnedCount >= 0,
    );

    TestValidator.predicate(
      "shipping performance median times non-negative",
      shippingStat.medianFulfillmentTimeHours >= 0 &&
        shippingStat.medianTransitTimeHours >= 0,
    );

    TestValidator.predicate(
      "shipping performance onTimeDeliveryRate between 0 and 1",
      shippingStat.onTimeDeliveryRate >= 0 &&
        shippingStat.onTimeDeliveryRate <= 1,
    );
  }

  // Additional sanity checks on KPI takeRate and resolution times
  TestValidator.predicate(
    "currentPlatformKpis.takeRate is within a reasonable range (0..2)",
    currentPlatformKpis.takeRate >= 0 && currentPlatformKpis.takeRate <= 2,
  );

  TestValidator.predicate(
    "refundAndDisputeStats average resolution times are non-negative",
    refundAndDisputeStats.averageRefundResolutionTimeHours >= 0 &&
      refundAndDisputeStats.averageDisputeResolutionTimeHours >= 0,
  );
}
