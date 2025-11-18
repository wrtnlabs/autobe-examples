import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCaseSlaSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDashboardPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboardPeriod";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputesSummary";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundsAndDisputesDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesDashboard";
import type { IShoppingMallRefundsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsSummary";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallTopRefundReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTopRefundReason";

/**
 * Validate the refunds & disputes dashboard empty-state behavior.
 *
 * Business context: The admin refunds/disputes dashboard aggregates statistics
 * and recent case samples from multiple underlying tables (refund requests,
 * disputes, SLA violations, etc.). When the system is freshly initialized and
 * no refund requests, disputes, chargebacks, or SLA records exist, the
 * dashboard must still:
 *
 * - Return successfully for an authenticated admin
 * - Provide a structurally complete response that matches
 *   IShoppingMallRefundsAndDisputesDashboard
 * - Represent the empty state using zero counts and empty arrays instead of
 *   omitting sections or returning nulls
 *
 * This test covers the happy-path empty-state scenario:
 *
 * 1. Register an admin in a clean environment via POST /auth/admin/join.
 * 2. Log in the same admin via POST /auth/admin/login.
 * 3. Call GET /shoppingMall/admin/refundsAndDisputes/dashboard.
 * 4. Assert the response type and validate that all numeric KPIs are zero and all
 *    case-list arrays are empty, confirming the correct empty-state behavior.
 */
export async function test_api_admin_refunds_disputes_dashboard_empty_state(
  connection: api.IConnection,
) {
  // 1. Register an admin in a clean environment
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    // Let backend derive IP when omitted; keep ip undefined to satisfy type
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Log the same admin in to ensure an authenticated session
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Call the refunds & disputes dashboard as the authenticated admin
  const dashboard: IShoppingMallRefundsAndDisputesDashboard =
    await api.functional.shoppingMall.admin.refundsAndDisputes.dashboard.index(
      connection,
    );
  typia.assert(dashboard);

  // 4. Validate dashboard structure and zero-state semantics
  // 4.1 period
  const period: IShoppingMallDashboardPeriod = dashboard.period;
  TestValidator.predicate(
    "dashboard period preset should be a non-empty string",
    () => period.preset.length > 0,
  );

  // 4.2 refundSummary zero state
  const refundSummary: IShoppingMallRefundsSummary = dashboard.refundSummary;
  TestValidator.equals(
    "refund_request_count should be zero in empty state",
    refundSummary.refund_request_count,
    0,
  );
  TestValidator.equals(
    "approved_refund_request_count should be zero in empty state",
    refundSummary.approved_refund_request_count,
    0,
  );
  TestValidator.equals(
    "rejected_refund_request_count should be zero in empty state",
    refundSummary.rejected_refund_request_count,
    0,
  );
  TestValidator.equals(
    "partial_refund_count should be zero in empty state",
    refundSummary.partial_refund_count,
    0,
  );
  TestValidator.equals(
    "full_refund_count should be zero in empty state",
    refundSummary.full_refund_count,
    0,
  );
  TestValidator.equals(
    "refunded_amount should be zero in empty state",
    refundSummary.refunded_amount,
    0,
  );
  TestValidator.equals(
    "average_refund_resolution_time_hours should be zero in empty state",
    refundSummary.average_refund_resolution_time_hours,
    0,
  );

  // 4.3 disputeSummary zero state
  const disputeSummary: IShoppingMallDisputesSummary = dashboard.disputeSummary;
  TestValidator.equals(
    "dispute_opened_count should be zero in empty state",
    disputeSummary.dispute_opened_count,
    0,
  );
  TestValidator.equals(
    "dispute_resolved_count should be zero in empty state",
    disputeSummary.dispute_resolved_count,
    0,
  );
  TestValidator.equals(
    "dispute_resolved_for_customer_count should be zero in empty state",
    disputeSummary.dispute_resolved_for_customer_count,
    0,
  );
  TestValidator.equals(
    "dispute_resolved_for_seller_count should be zero in empty state",
    disputeSummary.dispute_resolved_for_seller_count,
    0,
  );
  TestValidator.equals(
    "average_dispute_resolution_time_hours should be zero in empty state",
    disputeSummary.average_dispute_resolution_time_hours,
    0,
  );

  // 4.4 SLA summary zero state
  const slaSummary: IShoppingMallCaseSlaSummary = dashboard.slaSummary;
  TestValidator.equals(
    "total_violation_count should be zero in empty state",
    slaSummary.total_violation_count,
    0,
  );
  TestValidator.equals(
    "cancellation_violation_count should be zero in empty state",
    slaSummary.cancellation_violation_count,
    0,
  );
  TestValidator.equals(
    "refund_violation_count should be zero in empty state",
    slaSummary.refund_violation_count,
    0,
  );
  TestValidator.equals(
    "dispute_violation_count should be zero in empty state",
    slaSummary.dispute_violation_count,
    0,
  );

  // 4.5 arrays for reasons and recent cases should be empty, not null/undefined
  TestValidator.equals(
    "topRefundReasons should be an empty array in empty state",
    dashboard.topRefundReasons.length,
    0,
  );
  TestValidator.equals(
    "recentRefundRequests should be an empty array in empty state",
    dashboard.recentRefundRequests.length,
    0,
  );
  TestValidator.equals(
    "recentDisputes should be an empty array in empty state",
    dashboard.recentDisputes.length,
    0,
  );
}
