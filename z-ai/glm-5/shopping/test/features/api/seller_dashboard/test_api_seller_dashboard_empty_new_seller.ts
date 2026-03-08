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

/**
 * Test that a newly approved seller with no products or orders receives a valid
 * dashboard response with zero counts and empty arrays.
 *
 * **Preconditions:**
 * 1. Seller account is created and recently approved
 * 2. Seller has no products yet (new shop)
 * 3. No orders exist for this seller's products
 */
export async function test_api_seller_dashboard_empty_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Retrieve the dashboard for the newly approved seller
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // Verify all counts are zero for a seller with no activity
  TestValidator.equals("products_count", dashboard.products_count, 0);
  TestValidator.equals("order_items_count", dashboard.order_items_count, 0);
  TestValidator.equals(
    "pending_cancellations_count",
    dashboard.pending_cancellations_count,
    0,
  );
  TestValidator.equals(
    "pending_refunds_count",
    dashboard.pending_refunds_count,
    0,
  );
  // Verify low_stock_variants is empty (no variants exist yet)
  TestValidator.equals(
    "low_stock_variants is empty",
    dashboard.low_stock_variants.length,
    0,
  );
}
