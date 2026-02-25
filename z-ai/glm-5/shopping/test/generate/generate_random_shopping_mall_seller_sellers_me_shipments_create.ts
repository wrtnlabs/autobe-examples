import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order_shipment } from "../prepare/prepare_random_shopping_mall_order_shipment";

export async function generate_random_shopping_mall_seller_sellers_me_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrderShipment.ICreate>;
  },
): Promise<IShoppingMallOrderShipment> {
  const prepared: IShoppingMallOrderShipment.ICreate =
    prepare_random_shopping_mall_order_shipment(props.body);
  const result: IShoppingMallOrderShipment =
    await api.functional.shoppingMall.seller.sellers.me.shipments.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
