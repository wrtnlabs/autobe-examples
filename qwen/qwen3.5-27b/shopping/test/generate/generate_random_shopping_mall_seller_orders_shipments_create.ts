import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment } from "../prepare/prepare_random_shopping_mall_shipment";

/**
 * Generate a random shopping mall shipment via the API for E2E testing.
 *
 * Prepares random shipment data using the prepare function, then calls the creation endpoint
 * to create a new shipment package containing order items from the same seller. The shipment
 * includes carrier information and tracking number, and automatically transitions included
 * order items from 'paid' to 'shipped' status upon creation.
 */
export async function generate_random_shopping_mall_seller_orders_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipment.ICreate>;
    params: {
      orderId: string;
    };
  },
): Promise<IShoppingMallShipment> {
  const prepared: IShoppingMallShipment.ICreate =
    prepare_random_shopping_mall_shipment(props.body);
  const result: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderId: props.params.orderId,
        body: prepared,
      },
    );
  return result;
}
