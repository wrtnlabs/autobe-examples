import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_order_items_add_order_items } from "../../../generate/generate_random_shopping_mall_seller_shipments_order_items_add_order_items";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_order_item } from "../../../prepare/prepare_random_shopping_mall_shipment_order_item";

export async function test_api_seller_shipment_add_order_items_reject_unauthorized_seller(
  connection: api.IConnection,
): Promise<void> {
  // This test ensures that a seller cannot add order items to a shipment belonging to another seller.
  // Seller A joins and authenticates
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerA);
  sellerAConnection.headers = { Authorization: sellerA.token.access };
  // Seller B joins and authenticates
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerB);
  sellerBConnection.headers = { Authorization: sellerB.token.access };
  // Seller B creates a shipment
  const shipmentBySellerB =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerBConnection,
      {},
    );
  typia.assert(shipmentBySellerB);
  // Cast shipment to include 'id' property for type safety
  const shipmentId = (shipmentBySellerB as unknown as { id: string }).id;
  // Seller A attempts to add order items to Seller B's shipment
  // We expect an authorization error to be thrown
  await TestValidator.httpError(
    "seller should not add order items to another seller's shipment",
    403,
    async () => {
      await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
        sellerAConnection,
        {
          params: { shipmentId },
          body: typia.random<IShoppingMallShipmentOrderItem.ICreate>(),
        },
      );
    },
  );
}
