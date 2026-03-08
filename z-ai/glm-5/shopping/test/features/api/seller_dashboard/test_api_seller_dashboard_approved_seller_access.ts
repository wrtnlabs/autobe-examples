import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_approved_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection (connection isolation pattern)
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller account
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Call the dashboard endpoint
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // Validate dashboard metrics meet business constraints
  TestValidator.predicate(
    "products_count is non-negative",
    dashboard.products_count >= 0,
  );
  TestValidator.predicate(
    "order_items_count is non-negative",
    dashboard.order_items_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellations_count is non-negative",
    dashboard.pending_cancellations_count >= 0,
  );
  TestValidator.predicate(
    "pending_refunds_count is non-negative",
    dashboard.pending_refunds_count >= 0,
  );
}
