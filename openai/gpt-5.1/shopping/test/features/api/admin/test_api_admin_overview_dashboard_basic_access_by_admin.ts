import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOverviewDashboard";

/**
 * Validate that an authenticated admin can retrieve the admin overview
 * dashboard and that key KPI sections are logically consistent.
 *
 * Business purpose
 *
 * - Ensure that a freshly joined administrator (via /auth/admin/join) can access
 *   the consolidated KPI dashboard endpoint
 *   /shoppingMall/admin/dashboard/adminOverview.
 * - Verify that the returned payload structurally conforms to
 *   IShoppingMallAdminOverviewDashboard and that a few core KPI relationships
 *   are sane (e.g., paidOrderCount <= orderCount).
 *
 * High-level steps
 *
 * 1. Join a new admin using api.functional.auth.admin.join, which also wires the
 *    access token into connection.headers.Authorization.
 * 2. Call api.functional.shoppingMall.admin.dashboard.adminOverview.at with the
 *    authenticated connection.
 * 3. Use typia.assert to validate the full response against
 *    IShoppingMallAdminOverviewDashboard.
 * 4. Run lightweight business sanity checks on key KPI relationships, such as
 *    order counts and date coherence across sections.
 */
export async function test_api_admin_overview_dashboard_basic_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Join a new admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call the admin overview dashboard endpoint with authenticated admin
  const dashboard =
    await api.functional.shoppingMall.admin.dashboard.adminOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminOverviewDashboard>(dashboard);

  // 3. Basic structural and business sanity checks
  const {
    todayOrderStats,
    paymentMethodStats,
    shippingPerformanceStats,
    refundAndDisputeStats,
  } = dashboard;

  // 3-1. Order count relationships
  TestValidator.predicate(
    "today paid order count must not exceed total order count",
    () => todayOrderStats.paidOrderCount <= todayOrderStats.orderCount,
  );

  TestValidator.predicate(
    "today cancelled order count must not exceed total order count",
    () => todayOrderStats.cancelledOrderCount <= todayOrderStats.orderCount,
  );

  TestValidator.predicate(
    "today refunded order count must not exceed total order count",
    () => todayOrderStats.refundedOrderCount <= todayOrderStats.orderCount,
  );

  // 3-2. Payment method stats: if present, they should share the same statsDate day as todayOrderStats
  if (paymentMethodStats.length > 0) {
    const samplePayment = paymentMethodStats[0];
    TestValidator.predicate(
      "paymentMethodStats sample statsDate should represent same day as todayOrderStats.statsDate",
      () => {
        const todayDate = new Date(todayOrderStats.statsDate).toDateString();
        const paymentDate = new Date(samplePayment.statsDate).toDateString();
        return todayDate === paymentDate;
      },
    );
  }

  // 3-3. Shipping performance stats: if present, they should also be for the same day as todayOrderStats
  if (shippingPerformanceStats.length > 0) {
    const sampleShipping = shippingPerformanceStats[0];
    TestValidator.predicate(
      "shippingPerformanceStats sample statsDate should represent same day as todayOrderStats.statsDate",
      () => {
        const todayDate = new Date(todayOrderStats.statsDate).toDateString();
        const shippingDate = new Date(sampleShipping.statsDate).toDateString();
        return todayDate === shippingDate;
      },
    );
  }

  // 3-4. Refund and dispute stats: basic sanity check that its date bucket
  // is not in the future relative to todayOrderStats.statsDate.
  TestValidator.predicate(
    "refundAndDisputeStats.statsDate should not be later than todayOrderStats.statsDate",
    () => {
      const todayTime = new Date(todayOrderStats.statsDate).getTime();
      const refundDateTime = new Date(
        refundAndDisputeStats.statsDate,
      ).getTime();
      return refundDateTime <= todayTime;
    },
  );
}
