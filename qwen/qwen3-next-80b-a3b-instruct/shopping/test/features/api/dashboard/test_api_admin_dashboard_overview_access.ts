import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_dashboard_overview_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Use admin connection to retrieve dashboard overview
  const dashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.dashboards.admin.overview(
      adminConnection,
    );
  typia.assert(dashboard);
  // Step 3: Validate specific fields with descriptive TestValidator assertions
  TestValidator.equals(
    "total_admins matches expected",
    dashboard.total_admins,
    1,
  );
  TestValidator.equals(
    "total_customers matches expected",
    dashboard.total_customers,
    0,
  );
  TestValidator.equals(
    "total_sellers matches expected",
    dashboard.total_sellers,
    0,
  );
  TestValidator.equals(
    "total_products matches expected",
    dashboard.total_products,
    0,
  );
  TestValidator.equals(
    "total_orders matches expected",
    dashboard.total_orders,
    0,
  );
  TestValidator.equals(
    "total_revenue matches expected",
    dashboard.total_revenue,
    0,
  );
  TestValidator.equals(
    "total_payments matches expected",
    dashboard.total_payments,
    0,
  );
  TestValidator.equals(
    "pending_payments matches expected",
    dashboard.pending_payments,
    0,
  );
  TestValidator.equals(
    "total_reviews matches expected",
    dashboard.total_reviews,
    0,
  );
  TestValidator.equals(
    "total_alerts matches expected",
    dashboard.total_alerts,
    0,
  );
  TestValidator.equals(
    "active_sessions matches expected",
    dashboard.active_sessions,
    1,
  );
  TestValidator.equals(
    "total_data_exports matches expected",
    dashboard.total_data_exports,
    0,
  );
  TestValidator.equals(
    "pending_returns matches expected",
    dashboard.pending_returns,
    0,
  );
  TestValidator.equals(
    "order_completion_rate matches expected",
    dashboard.order_completion_rate,
    0,
  );
  TestValidator.equals(
    "payment_success_rate matches expected",
    dashboard.payment_success_rate,
    0,
  );
}
