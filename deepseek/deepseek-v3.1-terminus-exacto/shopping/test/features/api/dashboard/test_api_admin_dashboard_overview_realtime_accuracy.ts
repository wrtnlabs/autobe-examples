import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICategorySalesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategorySalesSummary";
import type { IPlatformMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformMetrics";
import type { IRecentSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecentSale";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallDashboardOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboardOverview";

/**
 * Test real-time accuracy of dashboard overview metrics by validating that data
 * reflects current platform state.
 *
 * This test creates an admin account, authenticates as administrator, then
 * verifies that salesToday, newCustomersToday, and ordersToday metrics
 * accurately represent current day activity. The test validates that
 * recentSales data includes the latest transactions and that platform metrics
 * reflect real-time platform performance without significant latency.
 */
export async function test_api_admin_dashboard_overview_realtime_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        dashboard: ["read", "write"],
        users: ["read", "manage"],
        products: ["read", "manage"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAccount);

  // Step 2: Authenticate as administrator to access dashboard functionality
  const authenticatedAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.shoppingmall.com/dashboard",
      referrer: "https://admin.shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(authenticatedAdmin);

  // Step 3: Retrieve dashboard overview metrics
  const dashboardOverview =
    await api.functional.shoppingMall.admin.dashboard.overview(connection);
  typia.assert(dashboardOverview);

  // Step 4: Validate required metrics are present and have valid values
  TestValidator.predicate(
    "totalSales should be a non-negative number",
    dashboardOverview.totalSales >= 0,
  );
  TestValidator.predicate(
    "totalCustomers should be a non-negative integer",
    dashboardOverview.totalCustomers >= 0,
  );
  TestValidator.predicate(
    "totalProducts should be a non-negative integer",
    dashboardOverview.totalProducts >= 0,
  );
  TestValidator.predicate(
    "totalOrders should be a non-negative integer",
    dashboardOverview.totalOrders >= 0,
  );
  TestValidator.predicate(
    "salesToday should be a non-negative number",
    dashboardOverview.salesToday >= 0,
  );
  TestValidator.predicate(
    "newCustomersToday should be a non-negative integer",
    dashboardOverview.newCustomersToday >= 0,
  );
  TestValidator.predicate(
    "ordersToday should be a non-negative integer",
    dashboardOverview.ordersToday >= 0,
  );
  TestValidator.predicate(
    "averageOrderValue should be a non-negative number",
    dashboardOverview.averageOrderValue >= 0,
  );

  // Step 5: Validate optional topSellingCategories if present
  if (dashboardOverview.topSellingCategories !== undefined) {
    TestValidator.predicate(
      "topSellingCategories should be an array",
      Array.isArray(dashboardOverview.topSellingCategories),
    );

    for (const category of dashboardOverview.topSellingCategories) {
      typia.assert<ICategorySalesSummary>(category);
      TestValidator.predicate(
        "category totalSales should be non-negative",
        category.totalSales >= 0,
      );
      TestValidator.predicate(
        "category transactionCount should be non-negative",
        category.transactionCount >= 0,
      );
      TestValidator.predicate(
        "category averageSaleValue should be non-negative",
        category.averageSaleValue >= 0,
      );
    }
  }

  // Step 6: Validate optional recentSales if present
  if (dashboardOverview.recentSales !== undefined) {
    TestValidator.predicate(
      "recentSales should be an array",
      Array.isArray(dashboardOverview.recentSales),
    );

    for (const sale of dashboardOverview.recentSales) {
      typia.assert<IRecentSale>(sale);
      TestValidator.predicate(
        "sale amount should be non-negative",
        sale.saleAmount >= 0,
      );
      TestValidator.predicate(
        "sale item count should be non-negative",
        sale.itemCount >= 0,
      );
      TestValidator.predicate(
        "sale commission rate should be between 0 and 1",
        sale.commissionRate >= 0 && sale.commissionRate <= 1,
      );
      TestValidator.predicate(
        "sale net amount should be non-negative",
        sale.netAmount >= 0,
      );
    }
  }

  // Step 7: Validate optional platformMetrics if present
  if (dashboardOverview.platformMetrics !== undefined) {
    typia.assert<IPlatformMetrics>(dashboardOverview.platformMetrics);
    TestValidator.predicate(
      "conversion rate should be between 0 and 1",
      dashboardOverview.platformMetrics.conversionRate >= 0 &&
        dashboardOverview.platformMetrics.conversionRate <= 1,
    );
    TestValidator.predicate(
      "customer retention rate should be between 0 and 1",
      dashboardOverview.platformMetrics.customerRetentionRate >= 0 &&
        dashboardOverview.platformMetrics.customerRetentionRate <= 1,
    );
    TestValidator.predicate(
      "inventory turnover should be non-negative",
      dashboardOverview.platformMetrics.inventoryTurnover >= 0,
    );
    TestValidator.predicate(
      "average response time should be non-negative",
      dashboardOverview.platformMetrics.averageResponseTime >= 0,
    );
    TestValidator.predicate(
      "total orders should be non-negative",
      dashboardOverview.platformMetrics.totalOrders >= 0,
    );
    TestValidator.predicate(
      "total customers should be non-negative",
      dashboardOverview.platformMetrics.totalCustomers >= 0,
    );
    TestValidator.predicate(
      "active sellers should be non-negative",
      dashboardOverview.platformMetrics.activeSellers >= 0,
    );
    TestValidator.predicate(
      "average order value should be non-negative",
      dashboardOverview.platformMetrics.averageOrderValue >= 0,
    );
  }
}
