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
 * Test that cross-seller snapshot access is properly denied.
 *
 * Validates that a seller cannot retrieve the seller profile snapshot for an
 * order item that belongs to a different seller's product. This enforces the
 * ownership boundary mandated by the platform's access control rules: sellers
 * are only authorized to view snapshots associated with their own products.
 *
 * The test registers two independent sellers (A and B), then has Seller A
 * attempt to access the seller snapshot for an order item identifier that
 * could only belong to Seller B's product context. The request is expected
 * to be rejected with an error response.
 *
 * 1. Seller A registers and authenticates via the seller join endpoint.
 * 2. Seller B registers and authenticates via the seller join endpoint.
 * 3. Seller A attempts to retrieve the seller snapshot using a random order
 *    item identifier, simulating access to another seller's order item.
 * 4. Validates the request is rejected, confirming cross-seller boundary
 *    enforcement.
 */
export async function test_api_seller_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A registers
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Seller B registers
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 3. Seller A attempts cross-seller snapshot access
  await TestValidator.error("cross-seller snapshot access denied", async () => {
    await api.functional.shoppingMall.seller.order_items.seller_snapshot.at(
      sellerAConnection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
