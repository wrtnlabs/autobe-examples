import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOverviewDashboard";

/**
 * Validate payment and shipping detail sections of the admin overview
 * dashboard.
 *
 * Business goal:
 *
 * - Ensure that, for an authenticated admin, the admin overview dashboard returns
 *   a well-formed `IShoppingMallAdminOverviewDashboard` object.
 * - Specifically verify that `paymentMethodStats` and `shippingPerformanceStats`
 *   sections are present, are arrays, and when they contain elements, each
 *   element structurally satisfies the DTO contract and basic business
 *   invariants (non-negative counts, sane ratios, and valid rate ranges).
 *
 * Scenario:
 *
 * 1. Register a new admin using POST /auth/admin/join.
 *
 *    - This issues an `IShoppingMallAdmin.IAuthorized` payload and the SDK
 *         automatically attaches the access token to `connection.headers`.
 * 2. Call GET /shoppingMall/admin/dashboard/adminOverview as that admin.
 * 3. Assert that the overview payload matches
 *    `IShoppingMallAdminOverviewDashboard` using `typia.assert`.
 * 4. Validate `paymentMethodStats`:
 *
 *    - Assert it is an array.
 *    - If empty, accept as valid but assert length===0.
 *    - If non-empty, for each `IPaymentMethodStat`:
 *
 *         - Use `typia.assert` for structural validation.
 *         - Assert all count fields are non-negative.
 *         - Assert `paymentSuccessCount + paymentFailureCount + paymentExpiredCount <=
 *                   paymentAttemptCount`.
 *         - Assert monetary fields (paidGmvAmount, refundedAmount, chargebackAmount) are
 *                   non-negative.
 * 5. Validate `shippingPerformanceStats`:
 *
 *    - Assert it is an array.
 *    - If empty, accept as valid but assert length===0.
 *    - If non-empty, for each `IShippingPerformanceStat`:
 *
 *         - Use `typia.assert` for structural validation.
 *         - Assert all shipment count fields are non-negative.
 *         - Optionally assert that the sum of shipment state counts does not exceed
 *                   `shipmentCreatedCount`.
 *         - Assert `medianFulfillmentTimeHours` and `medianTransitTimeHours` are
 *                   non-negative.
 *         - Assert `onTimeDeliveryRate` is between 0 and 1 inclusive.
 */
export async function test_api_admin_overview_dashboard_payment_and_shipping_detail_presence(
  connection: api.IConnection,
) {
  // 1. Register a new admin (authentication bootstrap)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call the admin overview dashboard
  const dashboard: IShoppingMallAdminOverviewDashboard =
    await api.functional.shoppingMall.admin.dashboard.adminOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminOverviewDashboard>(dashboard);

  // 3. Basic structural checks for paymentMethodStats
  TestValidator.predicate(
    "paymentMethodStats should be an array",
    Array.isArray(dashboard.paymentMethodStats),
  );

  if (dashboard.paymentMethodStats.length === 0) {
    TestValidator.equals(
      "paymentMethodStats length is zero when no stats are present",
      dashboard.paymentMethodStats.length,
      0,
    );
  } else {
    for (const stat of dashboard.paymentMethodStats) {
      // Re-assert element type for defensive validation
      typia.assert<IShoppingMallAdminOverviewDashboard.IPaymentMethodStat>(
        stat,
      );

      // Basic non-negativity checks for counts
      TestValidator.predicate(
        "paymentAttemptCount is non-negative",
        stat.paymentAttemptCount >= 0,
      );
      TestValidator.predicate(
        "paymentSuccessCount is non-negative",
        stat.paymentSuccessCount >= 0,
      );
      TestValidator.predicate(
        "paymentFailureCount is non-negative",
        stat.paymentFailureCount >= 0,
      );
      TestValidator.predicate(
        "paymentExpiredCount is non-negative",
        stat.paymentExpiredCount >= 0,
      );

      const totalOutcomeCount =
        stat.paymentSuccessCount +
        stat.paymentFailureCount +
        stat.paymentExpiredCount;

      TestValidator.predicate(
        "sum of payment outcome counts does not exceed attempts",
        totalOutcomeCount <= stat.paymentAttemptCount,
      );

      // Monetary fields should not be negative in normal operation
      TestValidator.predicate(
        "paidGmvAmount is non-negative",
        stat.paidGmvAmount >= 0,
      );
      TestValidator.predicate(
        "refundedAmount is non-negative (paymentMethodStats)",
        stat.refundedAmount >= 0,
      );
      TestValidator.predicate(
        "chargebackAmount is non-negative (paymentMethodStats)",
        stat.chargebackAmount >= 0,
      );
    }
  }

  // 4. Basic structural checks for shippingPerformanceStats
  TestValidator.predicate(
    "shippingPerformanceStats should be an array",
    Array.isArray(dashboard.shippingPerformanceStats),
  );

  if (dashboard.shippingPerformanceStats.length === 0) {
    TestValidator.equals(
      "shippingPerformanceStats length is zero when no stats are present",
      dashboard.shippingPerformanceStats.length,
      0,
    );
  } else {
    for (const stat of dashboard.shippingPerformanceStats) {
      // Re-assert element type for defensive validation
      typia.assert<IShoppingMallAdminOverviewDashboard.IShippingPerformanceStat>(
        stat,
      );

      // Non-negative shipment counts
      TestValidator.predicate(
        "shipmentCreatedCount is non-negative",
        stat.shipmentCreatedCount >= 0,
      );
      TestValidator.predicate(
        "shipmentShippedCount is non-negative",
        stat.shipmentShippedCount >= 0,
      );
      TestValidator.predicate(
        "shipmentDeliveredCount is non-negative",
        stat.shipmentDeliveredCount >= 0,
      );
      TestValidator.predicate(
        "shipmentDeliveryFailedCount is non-negative",
        stat.shipmentDeliveryFailedCount >= 0,
      );
      TestValidator.predicate(
        "shipmentReturnedCount is non-negative",
        stat.shipmentReturnedCount >= 0,
      );

      const shipmentStateTotal =
        stat.shipmentShippedCount +
        stat.shipmentDeliveredCount +
        stat.shipmentDeliveryFailedCount +
        stat.shipmentReturnedCount;

      TestValidator.predicate(
        "sum of shipment state counts does not exceed created shipments",
        shipmentStateTotal <= stat.shipmentCreatedCount,
      );

      // Time metrics should not be negative
      TestValidator.predicate(
        "medianFulfillmentTimeHours is non-negative",
        stat.medianFulfillmentTimeHours >= 0,
      );
      TestValidator.predicate(
        "medianTransitTimeHours is non-negative",
        stat.medianTransitTimeHours >= 0,
      );

      // Rate should be between 0 and 1 inclusive
      TestValidator.predicate(
        "onTimeDeliveryRate is between 0 and 1",
        stat.onTimeDeliveryRate >= 0 && stat.onTimeDeliveryRate <= 1,
      );
    }
  }
}
