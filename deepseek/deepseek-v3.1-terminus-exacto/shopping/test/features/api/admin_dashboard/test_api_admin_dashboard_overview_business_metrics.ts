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
 * Test dashboard overview focusing on business performance metrics and key
 * performance indicators. Validates that dashboard metrics accurately reflect
 * platform performance including conversion rates, customer retention rates,
 * inventory turnover, average response times, and active seller counts.
 */
export async function test_api_admin_dashboard_overview_business_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        dashboard_access: true,
        user_management: true,
        analytics_view: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(createdAdmin);

  // Step 2: Authenticate as administrator
  const authenticatedAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/dashboard",
      referrer: "https://admin.example.com/login",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(authenticatedAdmin);

  // Step 3: Retrieve dashboard overview
  const dashboardOverview =
    await api.functional.shoppingMall.admin.dashboard.overview(connection);
  typia.assert(dashboardOverview);

  // Step 4: Validate business metrics logical relationships
  TestValidator.predicate(
    "salesToday should not exceed totalSales",
    dashboardOverview.salesToday <= dashboardOverview.totalSales,
  );
  TestValidator.predicate(
    "newCustomersToday should not exceed totalCustomers",
    dashboardOverview.newCustomersToday <= dashboardOverview.totalCustomers,
  );
  TestValidator.predicate(
    "ordersToday should not exceed totalOrders",
    dashboardOverview.ordersToday <= dashboardOverview.totalOrders,
  );

  // Validate platform metrics ranges when present
  if (dashboardOverview.platformMetrics) {
    typia.assert(dashboardOverview.platformMetrics);

    TestValidator.predicate(
      "conversionRate should be between 0 and 1",
      dashboardOverview.platformMetrics.conversionRate >= 0 &&
        dashboardOverview.platformMetrics.conversionRate <= 1,
    );
    TestValidator.predicate(
      "customerRetentionRate should be between 0 and 1",
      dashboardOverview.platformMetrics.customerRetentionRate >= 0 &&
        dashboardOverview.platformMetrics.customerRetentionRate <= 1,
    );
    TestValidator.predicate(
      "inventoryTurnover should be non-negative",
      dashboardOverview.platformMetrics.inventoryTurnover >= 0,
    );
    TestValidator.predicate(
      "averageResponseTime should be non-negative",
      dashboardOverview.platformMetrics.averageResponseTime >= 0,
    );
    TestValidator.predicate(
      "activeSellers should be non-negative",
      dashboardOverview.platformMetrics.activeSellers >= 0,
    );
  }

  // Validate optional arrays structure when present
  if (dashboardOverview.topSellingCategories) {
    TestValidator.predicate(
      "topSellingCategories should be valid array",
      Array.isArray(dashboardOverview.topSellingCategories),
    );

    for (const category of dashboardOverview.topSellingCategories) {
      typia.assert(category);
    }
  }

  if (dashboardOverview.recentSales) {
    TestValidator.predicate(
      "recentSales should be valid array",
      Array.isArray(dashboardOverview.recentSales),
    );

    for (const sale of dashboardOverview.recentSales) {
      typia.assert(sale);
    }
  }
}
