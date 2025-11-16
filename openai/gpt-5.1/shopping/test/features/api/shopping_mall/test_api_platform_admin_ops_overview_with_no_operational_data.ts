import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminOpsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOpsOverview";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin operations overview dashboard with no operational
 * data.
 *
 * Business context:
 *
 * - A freshly registered platform administrator should be able to open the
 *   operations overview dashboard even when the system has no orders, refunds,
 *   after-sales, or seller activity.
 * - The API must respond with a fully structured IShoppingMallAdminOpsOverview
 *   object where numeric metrics are zero-like and list sections are present
 *   (arrays may be empty) rather than null.
 *
 * Steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join. This
 *    also issues tokens and binds them to the provided connection.
 * 2. Immediately call GET /shoppingMall/platformAdmin/dashboard/adminOpsOverview
 *    without creating any operational data.
 * 3. Assert that:
 *
 *    - The response conforms to IShoppingMallAdminOpsOverview.
 *    - All numeric counters in orderPipeline, afterSales, refunds, and
 *         sellerPerformance sections are zero.
 *    - RecentAdminActivities.recentActions exists as an array (possibly empty) and
 *         any elements conform to IAdminActionSummary.
 */
export async function test_api_platform_admin_ops_overview_with_no_operational_data(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator so that the subsequent
  //    dashboard call is authenticated as platformAdmin.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: "Platform Admin",
    password: "Str0ngP@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Retrieve admin operations overview dashboard in an empty system.
  const overview: IShoppingMallAdminOpsOverview =
    await api.functional.shoppingMall.platformAdmin.dashboard.adminOpsOverview.at(
      connection,
    );
  typia.assert(overview);

  // 3. Basic presence checks for all top-level sections.
  TestValidator.predicate(
    "orderPipeline section must be present",
    overview.orderPipeline !== null && overview.orderPipeline !== undefined,
  );
  TestValidator.predicate(
    "afterSales section must be present",
    overview.afterSales !== null && overview.afterSales !== undefined,
  );
  TestValidator.predicate(
    "refunds section must be present",
    overview.refunds !== null && overview.refunds !== undefined,
  );
  TestValidator.predicate(
    "sellerPerformance section must be present",
    overview.sellerPerformance !== null &&
      overview.sellerPerformance !== undefined,
  );
  TestValidator.predicate(
    "recentAdminActivities section must be present",
    overview.recentAdminActivities !== null &&
      overview.recentAdminActivities !== undefined,
  );

  // 4. Order pipeline metrics should be zero in a no-data environment.
  const op = overview.orderPipeline;
  TestValidator.equals("totalOrders should be zero", op.totalOrders, 0);
  TestValidator.equals("newOrders should be zero", op.newOrders, 0);
  TestValidator.equals(
    "inProcessingOrders should be zero",
    op.inProcessingOrders,
    0,
  );
  TestValidator.equals("shippedOrders should be zero", op.shippedOrders, 0);
  TestValidator.equals("deliveredOrders should be zero", op.deliveredOrders, 0);
  TestValidator.equals("cancelledOrders should be zero", op.cancelledOrders, 0);

  // 5. After-sales metrics should be zero.
  const as = overview.afterSales;
  TestValidator.equals(
    "openCancellationRequests should be zero",
    as.openCancellationRequests,
    0,
  );
  TestValidator.equals(
    "openReturnRequests should be zero",
    as.openReturnRequests,
    0,
  );
  TestValidator.equals("openDisputes should be zero", as.openDisputes, 0);
  TestValidator.equals(
    "recentlyResolvedCancellationRequests should be zero",
    as.recentlyResolvedCancellationRequests,
    0,
  );
  TestValidator.equals(
    "recentlyResolvedReturnRequests should be zero",
    as.recentlyResolvedReturnRequests,
    0,
  );
  TestValidator.equals(
    "recentlyResolvedDisputes should be zero",
    as.recentlyResolvedDisputes,
    0,
  );

  // 6. Refund metrics should be zero.
  const rf = overview.refunds;
  TestValidator.equals(
    "totalRefundTransactions should be zero",
    rf.totalRefundTransactions,
    0,
  );
  TestValidator.equals(
    "totalRefundAmount should be zero",
    rf.totalRefundAmount,
    0,
  );
  TestValidator.equals(
    "totalChargebacks should be zero",
    rf.totalChargebacks,
    0,
  );
  TestValidator.equals(
    "totalChargebackAmount should be zero",
    rf.totalChargebackAmount,
    0,
  );

  // 7. Seller performance metrics should be zero.
  const sp = overview.sellerPerformance;
  TestValidator.equals(
    "totalActiveSellers should be zero",
    sp.totalActiveSellers,
    0,
  );
  TestValidator.equals("highRiskSellers should be zero", sp.highRiskSellers, 0);
  TestValidator.equals(
    "underReviewSellers should be zero",
    sp.underReviewSellers,
    0,
  );
  TestValidator.equals(
    "suspendedSellers should be zero",
    sp.suspendedSellers,
    0,
  );

  // 8. Recent admin activities must expose a structurally valid array.
  const ra = overview.recentAdminActivities;
  TestValidator.predicate(
    "recentActions should be an array",
    Array.isArray(ra.recentActions),
  );

  // If any actions exist, ensure each one matches IAdminActionSummary.
  for (const action of ra.recentActions) {
    typia.assert<IShoppingMallAdminOpsOverview.IAdminActionSummary>(action);
  }
}
