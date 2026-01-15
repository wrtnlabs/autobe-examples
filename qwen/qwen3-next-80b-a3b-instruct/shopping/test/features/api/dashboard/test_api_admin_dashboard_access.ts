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
export async function test_api_admin_dashboard_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the dashboard endpoint with authorized connection
  const dashboard: IShoppingMallAdminDashboard =
    await api.functional.shoppingMall.admin.dashboard.admins.overview.index(
      adminConnection,
    );
  // Step 3: Validate all required properties exist and have non-negative values
  typia.assert(dashboard);
  // Validate all numeric values are non-negative (per IShoppingMallAdminDashboard definition)
  TestValidator.predicate("total_admins >= 0", dashboard.total_admins >= 0);
  TestValidator.predicate(
    "total_customers >= 0",
    dashboard.total_customers >= 0,
  );
  TestValidator.predicate("total_sellers >= 0", dashboard.total_sellers >= 0);
  TestValidator.predicate("total_products >= 0", dashboard.total_products >= 0);
  TestValidator.predicate("total_orders >= 0", dashboard.total_orders >= 0);
  TestValidator.predicate("total_revenue >= 0", dashboard.total_revenue >= 0);
  TestValidator.predicate("total_payments >= 0", dashboard.total_payments >= 0);
  TestValidator.predicate(
    "pending_payments >= 0",
    dashboard.pending_payments >= 0,
  );
  TestValidator.predicate("total_reviews >= 0", dashboard.total_reviews >= 0);
  TestValidator.predicate("total_alerts >= 0", dashboard.total_alerts >= 0);
  TestValidator.predicate(
    "active_sessions >= 0",
    dashboard.active_sessions >= 0,
  );
  TestValidator.predicate(
    "total_data_exports >= 0",
    dashboard.total_data_exports >= 0,
  );
  TestValidator.predicate(
    "pending_returns >= 0",
    dashboard.pending_returns >= 0,
  );
  // Validate percentage metrics are between 0 and 100 (inclusive)
  TestValidator.predicate(
    "order_completion_rate between 0 and 100",
    dashboard.order_completion_rate >= 0 &&
      dashboard.order_completion_rate <= 100,
  );
  TestValidator.predicate(
    "payment_success_rate between 0 and 100",
    dashboard.payment_success_rate >= 0 &&
      dashboard.payment_success_rate <= 100,
  );
}
