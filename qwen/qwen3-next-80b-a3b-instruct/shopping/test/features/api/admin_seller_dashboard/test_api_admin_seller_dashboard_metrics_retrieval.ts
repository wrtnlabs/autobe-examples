import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSellerDashboard";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_seller_dashboard_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account using join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<12>>(),
    },
  });
  typia.assert(seller);
  // Step 2: Create admin account and authenticate via login for persistent session
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    },
  });
  typia.assert(admin);
  // Step 3: Use admin login to authenticate and establish session for dashboard access
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: admin.token.refresh,
    },
  });
  // Step 4: Access the admin seller dashboard metrics endpoint
  const metrics =
    await api.functional.shoppingMall.seller.dashboard.sellers.metrics.index(
      adminConnection,
    );
  typia.assert(metrics);
  // Step 5: Validate that metrics are non-negative integers as per schema
  TestValidator.predicate(
    "total product count is non-negative",
    metrics.total_product_count >= 0,
  );
  TestValidator.predicate(
    "total order item count is non-negative",
    metrics.total_order_item_count >= 0,
  );
  TestValidator.predicate(
    "pending cancellation count is non-negative",
    metrics.pending_cancellation_count >= 0,
  );
  TestValidator.predicate(
    "pending refund count is non-negative",
    metrics.pending_refund_count >= 0,
  );
  // Step 6: Validate that non-admin cannot access the endpoint
  await TestValidator.error(
    "non-admin cannot access admin dashboard",
    async () => {
      await api.functional.shoppingMall.seller.dashboard.sellers.metrics.index(
        sellerConnection,
      );
    },
  );
}
