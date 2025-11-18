import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSystemOverviewActorsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewActorsSection";
import type { IShoppingMallSystemOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewDashboard";
import type { IShoppingMallSystemOverviewOrdersSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewOrdersSection";
import type { IShoppingMallSystemOverviewPaymentsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewPaymentsSection";
import type { IShoppingMallSystemOverviewRefundsAndDisputesSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewRefundsAndDisputesSection";
import type { IShoppingMallSystemOverviewRevenueSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewRevenueSection";
import type { IShoppingMallSystemOverviewRiskAndComplianceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewRiskAndComplianceSection";
import type { IShoppingMallSystemOverviewShippingSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemOverviewShippingSection";

export async function test_api_admin_system_overview_dashboard_data_consistency_after_activity(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // Helper for floating point approximate equality
  const approxEqual = (
    title: string,
    actual: number,
    expected: number,
    epsilon: number,
  ): void => {
    TestValidator.predicate(title, Math.abs(actual - expected) <= epsilon);
  };

  // Helper to assert a number lies within [min, max]
  const assertInRange = (
    title: string,
    value: number,
    min: number,
    max: number,
  ): void => {
    TestValidator.predicate(title, value >= min && value <= max);
  };

  // 2. First dashboard snapshot
  const dashboard1: IShoppingMallSystemOverviewDashboard =
    await api.functional.shoppingMall.admin.dashboard.systemOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSystemOverviewDashboard>(dashboard1);

  const orders1: IShoppingMallSystemOverviewOrdersSection = dashboard1.orders;
  const payments1: IShoppingMallSystemOverviewPaymentsSection =
    dashboard1.payments;
  const shipping1: IShoppingMallSystemOverviewShippingSection =
    dashboard1.shipping;
  const refundsAndDisputes1: IShoppingMallSystemOverviewRefundsAndDisputesSection =
    dashboard1.refundsAndDisputes;
  const revenue1: IShoppingMallSystemOverviewRevenueSection =
    dashboard1.revenue;
  const risk1: IShoppingMallSystemOverviewRiskAndComplianceSection =
    dashboard1.riskAndCompliance;
  const actors1: IShoppingMallSystemOverviewActorsSection = dashboard1.actors;

  // ---- Orders section invariants ----
  TestValidator.predicate(
    "orders.totalOrders is non-negative",
    orders1.totalOrders >= 0,
  );
  TestValidator.predicate(
    "orders.completedOrders is non-negative",
    orders1.completedOrders >= 0,
  );
  TestValidator.predicate(
    "orders.cancelledOrders is non-negative",
    orders1.cancelledOrders >= 0,
  );
  TestValidator.predicate(
    "orders.refundedOrders is non-negative",
    orders1.refundedOrders >= 0,
  );

  TestValidator.predicate(
    "orders.completedOrders <= totalOrders",
    orders1.completedOrders <= orders1.totalOrders,
  );
  TestValidator.predicate(
    "orders.cancelledOrders <= totalOrders",
    orders1.cancelledOrders <= orders1.totalOrders,
  );
  TestValidator.predicate(
    "orders.refundedOrders <= totalOrders",
    orders1.refundedOrders <= orders1.totalOrders,
  );

  if (orders1.totalOrders === 0) {
    TestValidator.equals(
      "when totalOrders is zero, completedOrders is zero",
      orders1.completedOrders,
      0,
    );
    TestValidator.equals(
      "when totalOrders is zero, cancelledOrders is zero",
      orders1.cancelledOrders,
      0,
    );
    TestValidator.equals(
      "when totalOrders is zero, refundedOrders is zero",
      orders1.refundedOrders,
      0,
    );
  }

  TestValidator.predicate(
    "orders.averageOrderValue is non-negative",
    orders1.averageOrderValue >= 0,
  );

  // ---- Payments section invariants ----
  TestValidator.predicate(
    "payments.totalPayments is non-negative",
    payments1.totalPayments >= 0,
  );
  TestValidator.predicate(
    "payments.successfulPayments is non-negative",
    payments1.successfulPayments >= 0,
  );
  TestValidator.predicate(
    "payments.failedPayments is non-negative",
    payments1.failedPayments >= 0,
  );

  TestValidator.predicate(
    "payments.successfulPayments + failedPayments >= totalPayments",
    payments1.successfulPayments + payments1.failedPayments >=
      payments1.totalPayments,
  );

  assertInRange(
    "payments.paymentSuccessRate is between 0 and 1",
    payments1.paymentSuccessRate,
    0,
    1,
  );

  if (payments1.totalPayments === 0) {
    approxEqual(
      "when totalPayments is zero, paymentSuccessRate is zero",
      payments1.paymentSuccessRate,
      0,
      1e-9,
    );
  } else {
    const expectedRate =
      payments1.totalPayments === 0
        ? 0
        : payments1.successfulPayments / payments1.totalPayments;
    approxEqual(
      "paymentSuccessRate approximates successfulPayments / totalPayments",
      payments1.paymentSuccessRate,
      expectedRate,
      1e-6,
    );
  }

  // ---- Shipping section invariants ----
  TestValidator.predicate(
    "shipping.shipmentsCreated is non-negative",
    shipping1.shipmentsCreated >= 0,
  );
  TestValidator.predicate(
    "shipping.shipmentsDelivered is non-negative",
    shipping1.shipmentsDelivered >= 0,
  );

  TestValidator.predicate(
    "shipping.shipmentsDelivered <= shipmentsCreated",
    shipping1.shipmentsDelivered <= shipping1.shipmentsCreated,
  );

  assertInRange(
    "shipping.onTimeDeliveryRate is between 0 and 1",
    shipping1.onTimeDeliveryRate,
    0,
    1,
  );

  TestValidator.predicate(
    "shipping.averageDeliveryTimeHours is non-negative",
    shipping1.averageDeliveryTimeHours >= 0,
  );

  if (shipping1.shipmentsDelivered === 0) {
    approxEqual(
      "when shipmentsDelivered is zero, averageDeliveryTimeHours is zero",
      shipping1.averageDeliveryTimeHours,
      0,
      1e-9,
    );
  } else {
    TestValidator.predicate(
      "when shipmentsDelivered > 0, averageDeliveryTimeHours is positive",
      shipping1.averageDeliveryTimeHours > 0,
    );
  }

  // ---- Refunds & Disputes with Revenue invariants ----
  TestValidator.predicate(
    "refundsAndDisputes.refundRequests is non-negative",
    refundsAndDisputes1.refundRequests >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.approvedRefunds is non-negative",
    refundsAndDisputes1.approvedRefunds >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.openDisputes is non-negative",
    refundsAndDisputes1.openDisputes >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.newDisputes is non-negative",
    refundsAndDisputes1.newDisputes >= 0,
  );

  TestValidator.predicate(
    "approvedRefunds <= refundRequests",
    refundsAndDisputes1.approvedRefunds <= refundsAndDisputes1.refundRequests,
  );

  TestValidator.predicate(
    "revenue.grossMerchandiseVolume is non-negative",
    revenue1.grossMerchandiseVolume >= 0,
  );
  TestValidator.predicate(
    "revenue.netRevenue is non-negative",
    revenue1.netRevenue >= 0,
  );
  TestValidator.predicate(
    "revenue.refundAmount is non-negative",
    revenue1.refundAmount >= 0,
  );
  TestValidator.predicate(
    "revenue.disputeLossAmount is non-negative",
    revenue1.disputeLossAmount >= 0,
  );

  if (revenue1.grossMerchandiseVolume > 0) {
    TestValidator.predicate(
      "netRevenue does not exceed grossMerchandiseVolume by large margin",
      revenue1.netRevenue <=
        revenue1.grossMerchandiseVolume +
          Math.abs(revenue1.grossMerchandiseVolume) * 1e-6,
    );
  }

  if (
    refundsAndDisputes1.refundRequests > 0 ||
    refundsAndDisputes1.newDisputes > 0
  ) {
    if (revenue1.grossMerchandiseVolume > 0) {
      const upperBound = revenue1.grossMerchandiseVolume * 10;
      TestValidator.predicate(
        "refundAmount is not more than 10x grossMerchandiseVolume",
        revenue1.refundAmount <= upperBound,
      );
      TestValidator.predicate(
        "disputeLossAmount is not more than 10x grossMerchandiseVolume",
        revenue1.disputeLossAmount <= upperBound,
      );
    }
  }

  // ---- Risk & Compliance invariants ----
  TestValidator.predicate(
    "riskAndCompliance.openRiskCases is non-negative",
    risk1.openRiskCases >= 0,
  );
  TestValidator.predicate(
    "riskAndCompliance.newRiskCases is non-negative",
    risk1.newRiskCases >= 0,
  );
  TestValidator.predicate(
    "riskAndCompliance.policyOverrides is non-negative",
    risk1.policyOverrides >= 0,
  );
  TestValidator.predicate(
    "riskAndCompliance.adminNotifications is non-negative",
    risk1.adminNotifications >= 0,
  );

  if (risk1.openRiskCases > 0) {
    TestValidator.predicate(
      "when openRiskCases > 0, newRiskCases remains non-negative",
      risk1.newRiskCases >= 0,
    );
    TestValidator.predicate(
      "when openRiskCases > 0, policyOverrides remains non-negative",
      risk1.policyOverrides >= 0,
    );
    TestValidator.predicate(
      "when openRiskCases > 0, adminNotifications remains non-negative",
      risk1.adminNotifications >= 0,
    );
  }

  // ---- Actors invariants ----
  TestValidator.predicate(
    "actors.activeCustomers is non-negative",
    actors1.activeCustomers >= 0,
  );
  TestValidator.predicate(
    "actors.newCustomers is non-negative",
    actors1.newCustomers >= 0,
  );
  TestValidator.predicate(
    "actors.activeSellers is non-negative",
    actors1.activeSellers >= 0,
  );
  TestValidator.predicate(
    "actors.newSellers is non-negative",
    actors1.newSellers >= 0,
  );

  TestValidator.predicate(
    "newCustomers <= activeCustomers",
    actors1.newCustomers <= actors1.activeCustomers,
  );
  TestValidator.predicate(
    "newSellers <= activeSellers",
    actors1.newSellers <= actors1.activeSellers,
  );

  // ---- Dashboard-level invariants ----
  TestValidator.predicate(
    "dashboard.generatedAt is non-empty string",
    typeof dashboard1.generatedAt === "string" &&
      dashboard1.generatedAt.length > 0,
  );

  if (dashboard1.timeWindow !== undefined) {
    TestValidator.predicate(
      "dashboard.timeWindow, when present, is non-empty",
      dashboard1.timeWindow.length > 0,
    );
  }

  // 3. Second snapshot for stability checks
  const dashboard2: IShoppingMallSystemOverviewDashboard =
    await api.functional.shoppingMall.admin.dashboard.systemOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSystemOverviewDashboard>(dashboard2);

  TestValidator.predicate(
    "second dashboard.generatedAt is non-empty string",
    typeof dashboard2.generatedAt === "string" &&
      dashboard2.generatedAt.length > 0,
  );

  // If both timeWindow values are defined, they should match
  if (
    dashboard1.timeWindow !== undefined &&
    dashboard2.timeWindow !== undefined
  ) {
    TestValidator.equals(
      "timeWindow stays consistent between snapshots when both defined",
      dashboard2.timeWindow,
      dashboard1.timeWindow,
    );
  }

  // Attempt to compare generatedAt ordering when parsable
  const date1 = new Date(dashboard1.generatedAt);
  const date2 = new Date(dashboard2.generatedAt);
  if (!Number.isNaN(date1.getTime()) && !Number.isNaN(date2.getTime())) {
    TestValidator.predicate(
      "second dashboard.generatedAt is not earlier than first",
      date2.getTime() >= date1.getTime(),
    );
  }
}
