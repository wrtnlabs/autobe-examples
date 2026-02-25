import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment_order_item } from "../prepare/prepare_random_shopping_mall_shipment_order_item";

/**
 * Generates a new shipment order item resource for testing.
 * Uses the prepare_random_shopping_mall_shipment_order_item to produce valid input data,
 * then calls the API to create the shipment order item record.
 *
 * @param connection API connection object.
 * @param props Optional parameters including partial creation body.
 * @returns The created shipment order item record.
 */
export async function generate_random_shopping_mall_seller_shipment_order_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipmentOrderItem.ICreate>;
  },
): Promise<IShoppingMallShipmentOrderItem> {
  const prepared: IShoppingMallShipmentOrderItem.ICreate =
    prepare_random_shopping_mall_shipment_order_item(props.body);
  const result: IShoppingMallShipmentOrderItem =
    await api.functional.shoppingMall.seller.shipmentOrderItems.create(
      connection,
      { body: prepared },
    );
  return result;
}
