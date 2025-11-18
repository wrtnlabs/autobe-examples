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
 * Validate basic admin access to the system overview dashboard.
 *
 * Business purpose
 *
 * - Ensure that an authenticated administrator can successfully retrieve the
 *   aggregated system overview dashboard.
 * - Verify that the dashboard payload is structurally consistent with
 *   IShoppingMallSystemOverviewDashboard and that key numeric KPIs are
 *   non-negative and, where applicable, in expected ranges.
 * - Provide a regression guard for the snapshot aggregation pipeline behind this
 *   endpoint.
 *
 * Test workflow
 *
 * 1. Join as a new admin using POST /auth/admin/join.
 *
 *    - This should return IShoppingMallAdmin.IAuthorized and implicitly set the
 *         Authorization header on the shared connection.
 * 2. Call GET /shoppingMall/admin/dashboard/systemOverview with the authenticated
 *    admin connection.
 * 3. Assert that the response is a valid IShoppingMallSystemOverviewDashboard.
 * 4. Validate business invariants for the dashboard:
 *
 *    - GeneratedAt is present.
 *    - TimeWindow, if present, is a non-empty string.
 *    - Orders, revenue, actors, payments, shipping, refundsAndDisputes,
 *         riskAndCompliance sections are all present.
 *    - All integer count metrics are non-negative.
 *    - Ratio fields such as paymentSuccessRate and onTimeDeliveryRate are between 0
 *         and 1 inclusive.
 *    - AverageOrderValue and averageDeliveryTimeHours are >= 0.
 * 5. Verify that an unauthenticated connection cannot access the dashboard by
 *    cloning the connection with empty headers and expecting an error when
 *    calling the same endpoint.
 */
export async function test_api_admin_system_overview_dashboard_basic_access(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // Sanity check on token structure
  const token: IAuthorizationToken = authorizedAdmin.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "admin token access field should be non-empty",
    () => token.access.length > 0,
  );

  // 2. Authenticated dashboard call
  const dashboard: IShoppingMallSystemOverviewDashboard =
    await api.functional.shoppingMall.admin.dashboard.systemOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSystemOverviewDashboard>(dashboard);

  // 3. Basic structural validations
  TestValidator.predicate(
    "generatedAt must be a non-empty string",
    () => dashboard.generatedAt.length > 0,
  );

  if (dashboard.timeWindow !== undefined) {
    TestValidator.predicate(
      "timeWindow, when present, must be a non-empty string",
      () => dashboard.timeWindow !== "",
    );
  }

  // 4. Section-level business validations
  const orders: IShoppingMallSystemOverviewOrdersSection = dashboard.orders;
  typia.assert<IShoppingMallSystemOverviewOrdersSection>(orders);

  TestValidator.predicate(
    "orders.totalOrders must be non-negative",
    () => orders.totalOrders >= 0,
  );
  TestValidator.predicate(
    "orders.completedOrders must be non-negative",
    () => orders.completedOrders >= 0,
  );
  TestValidator.predicate(
    "orders.cancelledOrders must be non-negative",
    () => orders.cancelledOrders >= 0,
  );
  TestValidator.predicate(
    "orders.refundedOrders must be non-negative",
    () => orders.refundedOrders >= 0,
  );
  TestValidator.predicate(
    "orders.averageOrderValue must be non-negative",
    () => orders.averageOrderValue >= 0,
  );

  const revenue: IShoppingMallSystemOverviewRevenueSection = dashboard.revenue;
  typia.assert<IShoppingMallSystemOverviewRevenueSection>(revenue);

  TestValidator.predicate(
    "revenue.grossMerchandiseVolume must be non-negative",
    () => revenue.grossMerchandiseVolume >= 0,
  );
  TestValidator.predicate(
    "revenue.netRevenue must be non-negative",
    () => revenue.netRevenue >= 0,
  );
  TestValidator.predicate(
    "revenue.refundAmount must be non-negative",
    () => revenue.refundAmount >= 0,
  );
  TestValidator.predicate(
    "revenue.disputeLossAmount must be non-negative",
    () => revenue.disputeLossAmount >= 0,
  );

  const actors: IShoppingMallSystemOverviewActorsSection = dashboard.actors;
  typia.assert<IShoppingMallSystemOverviewActorsSection>(actors);

  TestValidator.predicate(
    "actors.activeCustomers must be non-negative",
    () => actors.activeCustomers >= 0,
  );
  TestValidator.predicate(
    "actors.newCustomers must be non-negative",
    () => actors.newCustomers >= 0,
  );
  TestValidator.predicate(
    "actors.activeSellers must be non-negative",
    () => actors.activeSellers >= 0,
  );
  TestValidator.predicate(
    "actors.newSellers must be non-negative",
    () => actors.newSellers >= 0,
  );

  const payments: IShoppingMallSystemOverviewPaymentsSection =
    dashboard.payments;
  typia.assert<IShoppingMallSystemOverviewPaymentsSection>(payments);

  TestValidator.predicate(
    "payments.totalPayments must be non-negative",
    () => payments.totalPayments >= 0,
  );
  TestValidator.predicate(
    "payments.successfulPayments must be non-negative",
    () => payments.successfulPayments >= 0,
  );
  TestValidator.predicate(
    "payments.failedPayments must be non-negative",
    () => payments.failedPayments >= 0,
  );
  TestValidator.predicate(
    "payments.paymentSuccessRate must be between 0 and 1",
    () => payments.paymentSuccessRate >= 0 && payments.paymentSuccessRate <= 1,
  );

  const shipping: IShoppingMallSystemOverviewShippingSection =
    dashboard.shipping;
  typia.assert<IShoppingMallSystemOverviewShippingSection>(shipping);

  TestValidator.predicate(
    "shipping.shipmentsCreated must be non-negative",
    () => shipping.shipmentsCreated >= 0,
  );
  TestValidator.predicate(
    "shipping.shipmentsDelivered must be non-negative",
    () => shipping.shipmentsDelivered >= 0,
  );
  TestValidator.predicate(
    "shipping.onTimeDeliveryRate must be between 0 and 1",
    () => shipping.onTimeDeliveryRate >= 0 && shipping.onTimeDeliveryRate <= 1,
  );
  TestValidator.predicate(
    "shipping.averageDeliveryTimeHours must be non-negative",
    () => shipping.averageDeliveryTimeHours >= 0,
  );

  const refundsAndDisputes: IShoppingMallSystemOverviewRefundsAndDisputesSection =
    dashboard.refundsAndDisputes;
  typia.assert<IShoppingMallSystemOverviewRefundsAndDisputesSection>(
    refundsAndDisputes,
  );

  TestValidator.predicate(
    "refundsAndDisputes.refundRequests must be non-negative",
    () => refundsAndDisputes.refundRequests >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.approvedRefunds must be non-negative",
    () => refundsAndDisputes.approvedRefunds >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.openDisputes must be non-negative",
    () => refundsAndDisputes.openDisputes >= 0,
  );
  TestValidator.predicate(
    "refundsAndDisputes.newDisputes must be non-negative",
    () => refundsAndDisputes.newDisputes >= 0,
  );

  const riskAndCompliance: IShoppingMallSystemOverviewRiskAndComplianceSection =
    dashboard.riskAndCompliance;
  typia.assert<IShoppingMallSystemOverviewRiskAndComplianceSection>(
    riskAndCompliance,
  );

  TestValidator.predicate(
    "riskAndCompliance.openRiskCases must be non-negative",
    () => riskAndCompliance.openRiskCases >= 0,
  );
  TestValidator.predicate(
    "riskAndCompliance.newRiskCases must be non-negative",
    () => riskAndCompliance.newRiskCases >= 0,
  );
  TestValidator.predicate(
    "riskAndCompliance.policyOverrides must be non-negative",
    () => riskAndCompliance.policyOverrides >= 0,
  );
  TestValidator.predicate(
    "riskAndCompliance.adminNotifications must be non-negative",
    () => riskAndCompliance.adminNotifications >= 0,
  );

  // 5. Unauthenticated access should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to system overview dashboard must fail",
    async () => {
      await api.functional.shoppingMall.admin.dashboard.systemOverview.at(
        unauthenticatedConnection,
      );
    },
  );
}
