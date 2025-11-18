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

/**
 * Validate admin access to the system overview dashboard with emphasis on the
 * risk and compliance section.
 *
 * Business goal:
 *
 * - Ensure that a freshly joined administrator can retrieve the aggregated system
 *   overview dashboard.
 * - Confirm that the `riskAndCompliance` segment of the dashboard is present,
 *   structurally valid, and returns non-negative metrics suitable for
 *   monitoring governance and risk posture.
 * - Provide a regression guard that the high-level GRC metrics pipeline continues
 *   to populate the dashboard correctly, even though this test does not
 *   directly seed underlying risk case or policy override data.
 *
 * High-level steps:
 *
 * 1. Register a new admin via POST /auth/admin/join, which also establishes an
 *    authenticated admin context on the SDK connection.
 * 2. Call GET /shoppingMall/admin/dashboard/systemOverview using the authenticated
 *    connection.
 * 3. Assert that the result conforms to IShoppingMallSystemOverviewDashboard.
 * 4. Extract the riskAndCompliance section and validate that its counters are
 *    non-negative integers as promised by the contract.
 * 5. Perform conservative sanity checks on other sections to ensure the dashboard
 *    is holistically well-formed without imposing undocumented business
 *    invariants.
 */
export async function test_api_admin_system_overview_dashboard_risk_and_compliance_focus(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-dashboard.test/join",
    referrer: "https://admin-dashboard.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // Sanity checks on authorization payload
  TestValidator.predicate(
    "admin authorization token access should be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.equals(
    "authorized admin email should match join request email",
    authorized.email,
    joinBody.email,
  );

  // 2. Retrieve system overview dashboard as the authenticated admin
  const dashboard: IShoppingMallSystemOverviewDashboard =
    await api.functional.shoppingMall.admin.dashboard.systemOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSystemOverviewDashboard>(dashboard);

  // 3. Focus on riskAndCompliance section
  const risk: IShoppingMallSystemOverviewRiskAndComplianceSection =
    dashboard.riskAndCompliance;

  // Risk & compliance metrics must be non-negative integers as per contract
  TestValidator.predicate(
    "openRiskCases must be non-negative",
    risk.openRiskCases >= 0,
  );
  TestValidator.predicate(
    "newRiskCases must be non-negative",
    risk.newRiskCases >= 0,
  );
  TestValidator.predicate(
    "policyOverrides must be non-negative",
    risk.policyOverrides >= 0,
  );
  TestValidator.predicate(
    "adminNotifications must be non-negative",
    risk.adminNotifications >= 0,
  );

  // 4. Conservative holistic checks on other sections
  const orders: IShoppingMallSystemOverviewOrdersSection = dashboard.orders;
  const revenue: IShoppingMallSystemOverviewRevenueSection = dashboard.revenue;
  const actors: IShoppingMallSystemOverviewActorsSection = dashboard.actors;
  const payments: IShoppingMallSystemOverviewPaymentsSection =
    dashboard.payments;
  const shipping: IShoppingMallSystemOverviewShippingSection =
    dashboard.shipping;
  const refundsAndDisputes: IShoppingMallSystemOverviewRefundsAndDisputesSection =
    dashboard.refundsAndDisputes;

  // Orders section should have non-negative counts
  TestValidator.predicate(
    "orders.totalOrders must be non-negative",
    orders.totalOrders >= 0,
  );
  TestValidator.predicate(
    "orders.completedOrders must be non-negative",
    orders.completedOrders >= 0,
  );
  TestValidator.predicate(
    "orders.cancelledOrders must be non-negative",
    orders.cancelledOrders >= 0,
  );
  TestValidator.predicate(
    "orders.refundedOrders must be non-negative",
    orders.refundedOrders >= 0,
  );

  // Actors section should have non-negative counts
  TestValidator.predicate(
    "actors.activeCustomers must be non-negative",
    actors.activeCustomers >= 0,
  );
  TestValidator.predicate(
    "actors.newCustomers must be non-negative",
    actors.newCustomers >= 0,
  );
  TestValidator.predicate(
    "actors.activeSellers must be non-negative",
    actors.activeSellers >= 0,
  );
  TestValidator.predicate(
    "actors.newSellers must be non-negative",
    actors.newSellers >= 0,
  );

  // Payments section non-negative counts and valid rate bounds
  TestValidator.predicate(
    "payments.totalPayments must be non-negative",
    payments.totalPayments >= 0,
  );
  TestValidator.predicate(
    "payments.successfulPayments must be non-negative",
    payments.successfulPayments >= 0,
  );
  TestValidator.predicate(
    "payments.failedPayments must be non-negative",
    payments.failedPayments >= 0,
  );
  TestValidator.predicate(
    "payments.paymentSuccessRate must be within [0,1]",
    payments.paymentSuccessRate >= 0 && payments.paymentSuccessRate <= 1,
  );

  // Shipping section non-negative counts and basic rate/time sanity
  TestValidator.predicate(
    "shipping.shipmentsCreated must be non-negative",
    shipping.shipmentsCreated >= 0,
  );
  TestValidator.predicate(
    "shipping.shipmentsDelivered must be non-negative",
    shipping.shipmentsDelivered >= 0,
  );
  TestValidator.predicate(
    "shipping.onTimeDeliveryRate must be within [0,1]",
    shipping.onTimeDeliveryRate >= 0 && shipping.onTimeDeliveryRate <= 1,
  );
  TestValidator.predicate(
    "shipping.averageDeliveryTimeHours must be non-negative",
    shipping.averageDeliveryTimeHours >= 0,
  );

  // Refunds & disputes section non-negative counts
  TestValidator.predicate(
    "refundsAndDisputes.refundRequests must be non-negative",
    refundsAndDisputes.refundRequests >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.approvedRefunds must be non-negative",
    refundsAndDisputes.approvedRefunds >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.openDisputes must be non-negative",
    refundsAndDisputes.openDisputes >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.newDisputes must be non-negative",
    refundsAndDisputes.newDisputes >= 0,
  );

  // Revenue section sanity: values should be finite numbers; allow negatives
  // in case of edge financial scenarios, so we only assert they are finite.
  TestValidator.predicate(
    "revenue.grossMerchandiseVolume must be a finite number",
    Number.isFinite(revenue.grossMerchandiseVolume),
  );
  TestValidator.predicate(
    "revenue.netRevenue must be a finite number",
    Number.isFinite(revenue.netRevenue),
  );
  TestValidator.predicate(
    "revenue.refundAmount must be a finite number",
    Number.isFinite(revenue.refundAmount),
  );
  TestValidator.predicate(
    "revenue.disputeLossAmount must be a finite number",
    Number.isFinite(revenue.disputeLossAmount),
  );
}
