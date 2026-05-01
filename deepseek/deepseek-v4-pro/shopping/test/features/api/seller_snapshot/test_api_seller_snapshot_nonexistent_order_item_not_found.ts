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
 * Test that requesting a seller snapshot for a non-existent order item returns 404.
 *
 * Validates that the seller snapshot endpoint correctly returns a 404 Not Found
 * response when queried with a syntactically valid UUID that does not correspond
 * to any existing order item in the system. Since the snapshot table uses
 * @@unique on the shopping_mall_order_item_id column, no matching row exists for
 * a fabricated identifier, and the server must return 404.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. A random non-existent UUID is generated as the itemId.
 * 3. The seller queries the snapshot endpoint with the fabricated UUID.
 * 4. The response is validated to be a 404 HttpError.
 */
export async function test_api_seller_snapshot_nonexistent_order_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Generate a random UUID that doesn't correspond to any order item
  const nonexistentItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. & 4. Attempt to query snapshot and expect 404
  await TestValidator.httpError(
    "nonexistent order item returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.order_items.seller_snapshot.at(
        sellerConnection,
        { itemId: nonexistentItemId },
      );
    },
  );
}
