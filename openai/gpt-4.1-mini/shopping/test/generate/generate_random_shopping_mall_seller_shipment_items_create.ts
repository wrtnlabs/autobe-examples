import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment_item } from "../prepare/prepare_random_shopping_mall_shipment_item";

export async function generate_random_shopping_mall_seller_shipment_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipmentItem.ICreate> | undefined;
  },
): Promise<IShoppingMallShipmentItem> {
  const prepared: IShoppingMallShipmentItem.ICreate =
    prepare_random_shopping_mall_shipment_item(props.body);
  const result: IShoppingMallShipmentItem =
    await api.functional.shoppingMall.seller.shipment_items.create(connection, {
      body: prepared,
    });
  return result;
}
