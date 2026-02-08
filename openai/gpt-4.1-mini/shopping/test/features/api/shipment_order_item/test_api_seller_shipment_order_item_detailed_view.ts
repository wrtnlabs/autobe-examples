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

export async function test_api_seller_shipment_order_item_detailed_view(
  connection: api.IConnection,
): Promise<void> {
  // Create seller 1 connection and authorize seller 1
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  seller1Connection.headers = { Authorization: seller1Authorized.token.access };
  // Seller 1 creates shipment
  const shipment1: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      seller1Connection,
      {},
    );
  typia.assert(shipment1);
  // Add order items to shipment 1
  const shipment1OrderItemSummary: IShoppingMallShipmentOrderItem.ISummary =
    await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
      seller1Connection,
      {
        params: {
          shipmentId:
            (
              shipment1 as unknown as {
                id: string;
              }
            ).id ?? typia.random<string & tags.Format<"uuid">>(),
        },
        body: typia.random<IShoppingMallShipmentOrderItem.ICreate>(),
      },
    );
  typia.assert(shipment1OrderItemSummary);
  // Fetch detail for added order item within shipment
  const detail1: IShoppingMallShipmentOrderItem =
    await api.functional.shoppingMall.seller.shipments.order_items.at(
      seller1Connection,
      {
        shipmentId:
          (
            shipment1 as unknown as {
              id: string;
            }
          ).id ?? typia.random<string & tags.Format<"uuid">>(),
        orderItemId:
          (
            shipment1OrderItemSummary as unknown as {
              id: string;
            }
          ).id ?? typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(detail1);
  // Scenario 2: Attempt to get detail with order item not linked to shipment (should throw 404)
  // Create seller 2
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  seller2Connection.headers = { Authorization: seller2Authorized.token.access };
  // Seller 2 creates shipment
  const shipment2: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      seller2Connection,
      {},
    );
  typia.assert(shipment2);
  // Seller 2 adds order items
  const shipment2OrderItemSummary: IShoppingMallShipmentOrderItem.ISummary =
    await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
      seller2Connection,
      {
        params: {
          shipmentId:
            (
              shipment2 as unknown as {
                id: string;
              }
            ).id ?? typia.random<string & tags.Format<"uuid">>(),
        },
        body: typia.random<IShoppingMallShipmentOrderItem.ICreate>(),
      },
    );
  typia.assert(shipment2OrderItemSummary);
  // Attempt to fetch detail for seller1 shipment using seller2's order item ID, expecting 404
  await TestValidator.httpError(
    "invalid order item not linked to shipment returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.order_items.at(
        seller1Connection,
        {
          shipmentId:
            (
              shipment1 as unknown as {
                id: string;
              }
            ).id ?? typia.random<string & tags.Format<"uuid">>(),
          orderItemId:
            (
              shipment2OrderItemSummary as unknown as {
                id: string;
              }
            ).id ?? typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Scenario 3: Unauthorized access by seller 2 to seller 1's shipment order item
  await TestValidator.httpError(
    "unauthorized seller access returns 403 or 404",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipments.order_items.at(
        seller2Connection,
        {
          shipmentId:
            (
              shipment1 as unknown as {
                id: string;
              }
            ).id ?? typia.random<string & tags.Format<"uuid">>(),
          orderItemId:
            (
              shipment1OrderItemSummary as unknown as {
                id: string;
              }
            ).id ?? typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
