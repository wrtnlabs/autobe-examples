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

export async function test_api_seller_shipment_add_order_items_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Create a shipment by the authorized seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(shipment);
  const shipmentId = (shipment as any).id;
  // 3. Add order items to the shipment
  const addedOrderItems =
    await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
      sellerConnection,
      {
        params: { shipmentId },
        body: undefined,
      },
    );
  typia.assert(addedOrderItems);
  // 4. Test unauthorized access - another seller tries to add order items
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSeller = await authorize_seller_join(anotherSellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(anotherSeller);
  anotherSellerConnection.headers = {
    Authorization: anotherSeller.token.access,
  };
  await TestValidator.error(
    "unauthorized seller cannot add order items to someone else's shipment",
    async () => {
      await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
        anotherSellerConnection,
        {
          params: { shipmentId },
          body: undefined,
        },
      );
    },
  );
  // 5. Test invalid shipment ID
  await TestValidator.error(
    "adding order items with invalid shipment ID should fail",
    async () => {
      await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
        sellerConnection,
        {
          params: { shipmentId: typia.random<string & tags.Format<"uuid">>() },
          body: undefined,
        },
      );
    },
  );
}
