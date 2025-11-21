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
 * Comprehensive dashboard overview retrieval test for shopping mall platform.
 *
 * This test validates that administrators can retrieve complete dashboard
 * statistics including sales metrics, customer counts, product inventory, order
 * statistics, and platform performance indicators. The test follows the proper
 * authentication workflow and ensures all dashboard metrics are accurately
 * aggregated and returned.
 */
export async function test_api_admin_dashboard_overview_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const createdAdmin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          dashboard: ["read", "write"],
          users: ["read", "write", "delete"],
          products: ["read", "write", "delete"],
          orders: ["read", "write", "delete"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Authenticate as administrator
  const authenticatedAdmin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://shopping-mall-admin.example.com/dashboard",
        referrer: "https://shopping-mall-admin.example.com/login",
      } satisfies IShoppingMallAdministrator.ILogin,
    });
  typia.assert(authenticatedAdmin);

  // Step 3: Retrieve dashboard overview
  const dashboardOverview: IShoppingMallDashboardOverview =
    await api.functional.shoppingMall.admin.dashboard.overview(connection);
  typia.assert(dashboardOverview);

  // Step 4: Validate dashboard structure and metrics
  // typia.assert() above already validates ALL types perfectly - no need for additional type checks

  // Validate business logic relationships
  if (dashboardOverview.totalOrders > 0) {
    TestValidator.predicate(
      "averageOrderValue should equal totalSales divided by totalOrders",
      Math.abs(
        dashboardOverview.averageOrderValue -
          dashboardOverview.totalSales / dashboardOverview.totalOrders,
      ) < 0.01,
    );
  }

  // Validate optional arrays if present
  if (dashboardOverview.topSellingCategories !== undefined) {
    // typia.assert() on dashboardOverview already validated the array structure

    for (const category of dashboardOverview.topSellingCategories) {
      // Validate business logic for each category
      if (category.transactionCount > 0) {
        TestValidator.predicate(
          "category averageSaleValue should equal totalSales divided by transactionCount",
          Math.abs(
            category.averageSaleValue -
              category.totalSales / category.transactionCount,
          ) < 0.01,
        );
      }
    }
  }

  // Validate recent sales business logic
  if (dashboardOverview.recentSales !== undefined) {
    for (const sale of dashboardOverview.recentSales) {
      // Validate commission calculation
      TestValidator.predicate(
        "netAmount should equal saleAmount minus commission",
        Math.abs(
          sale.netAmount - sale.saleAmount * (1 - sale.commissionRate / 100),
        ) < 0.01,
      );
    }
  }

  // Validate platform metrics business logic
  if (dashboardOverview.platformMetrics !== undefined) {
    if (
      dashboardOverview.platformMetrics.totalCustomers > 0 &&
      dashboardOverview.platformMetrics.totalOrders > 0
    ) {
      TestValidator.predicate(
        "platform conversionRate should equal totalOrders divided by totalCustomers",
        Math.abs(
          dashboardOverview.platformMetrics.conversionRate -
            dashboardOverview.platformMetrics.totalOrders /
              dashboardOverview.platformMetrics.totalCustomers,
        ) < 0.01,
      );
    }
  }

  // Validate that all numeric values are non-negative (business requirement)
  TestValidator.predicate(
    "totalSales should be non-negative",
    dashboardOverview.totalSales >= 0,
  );
  TestValidator.predicate(
    "totalCustomers should be non-negative",
    dashboardOverview.totalCustomers >= 0,
  );
  TestValidator.predicate(
    "totalProducts should be non-negative",
    dashboardOverview.totalProducts >= 0,
  );
  TestValidator.predicate(
    "totalOrders should be non-negative",
    dashboardOverview.totalOrders >= 0,
  );
  TestValidator.predicate(
    "salesToday should be non-negative",
    dashboardOverview.salesToday >= 0,
  );
  TestValidator.predicate(
    "newCustomersToday should be non-negative",
    dashboardOverview.newCustomersToday >= 0,
  );
  TestValidator.predicate(
    "ordersToday should be non-negative",
    dashboardOverview.ordersToday >= 0,
  );
  TestValidator.predicate(
    "averageOrderValue should be non-negative",
    dashboardOverview.averageOrderValue >= 0,
  );
}
