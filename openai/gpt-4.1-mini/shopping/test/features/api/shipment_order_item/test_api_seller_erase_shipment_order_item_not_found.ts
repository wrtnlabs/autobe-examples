import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the deletion attempt of a shipment order item with a non-existing shipmentOrderItemId by an authenticated seller.
 * The test expects an HTTP 404 Not Found error.
 */
export async function test_api_seller_erase_shipment_order_item_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and is authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "default-password",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 2. Attempt to delete a non-existent shipment order item
  const fakeShipmentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion attempt of non-existing shipment order item returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipmentOrderItems.eraseShipmentOrderItem(
        sellerConnection,
        { shipmentOrderItemId: fakeShipmentOrderItemId },
      );
    },
  );
}
