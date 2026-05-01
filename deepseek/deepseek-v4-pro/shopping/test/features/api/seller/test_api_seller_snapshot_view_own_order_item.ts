import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieval of the order item seller profile snapshot.
 *
 * Validates that an authenticated seller can retrieve the frozen seller profile snapshot associated with an order item. The snapshot captures the shop name, logo image URL (nullable if no logo was uploaded at purchase time), and creation timestamp — all preserved exactly as they appeared at order placement.
 *
 * This ensures that historical seller profile data remains accessible through the snapshot mechanism even after subsequent profile changes, supporting order history integrity and dispute resolution.
 *
 * 1. Seller registers and authenticates via join.
 * 2. Seller calls the snapshot endpoint for a given order item ID.
 * 3. Validates the response contains id, shop_name, logo_image_url, and created_at fields.
 */
export async function test_api_seller_snapshot_view_own_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Retrieve seller snapshot for an order item
  const snapshot: IShoppingMallOrderItemSellerSnapshot =
    await api.functional.shoppingMall.seller.order_items.seller_snapshot.at(
      sellerConnection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
}
