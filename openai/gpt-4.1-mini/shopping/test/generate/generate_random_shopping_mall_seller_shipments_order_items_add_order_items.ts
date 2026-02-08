import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment_order_item } from "../prepare/prepare_random_shopping_mall_shipment_order_item";

/**
 * Generates and adds order items to a specific shipment for testing purposes.
 *
 * @param connection - API connection object
 * @param props - Object containing optional request body and required shipmentId parameter
 * @returns Created shipment order item summary
 */
export async function generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipmentOrderItem.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IShoppingMallShipmentOrderItem.ISummary> {
  const prepared: IShoppingMallShipmentOrderItem.ICreate =
    prepare_random_shopping_mall_shipment_order_item(props.body);
  const result: IShoppingMallShipmentOrderItem.ISummary =
    await api.functional.shoppingMall.seller.shipments.order_items.addOrderItems(
      connection,
      {
        shipmentId: props.params.shipmentId,
        body: prepared,
      },
    );
  return result;
}
