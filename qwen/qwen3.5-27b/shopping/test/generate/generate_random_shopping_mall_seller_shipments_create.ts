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
 * Generate a random shopping mall shipment for E2E testing.
 *
 * Creates a new shipment package containing one or more order items from the same seller.
 * The shipment includes carrier name and tracking number for delivery tracking.
 * Upon creation, all included order items transition from 'paid' to 'shipped' status.
 *
 * This function uses the prepare function to generate random test data, then calls
 * the API to create the actual shipment resource. The shipment is immediately visible
 * to customers in their order details with tracking information.
 */
export async function generate_random_shopping_mall_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipment.ICreate>;
  },
): Promise<IShoppingMallShipment> {
  const prepared: IShoppingMallShipment.ICreate =
    prepare_random_shopping_mall_shipment(props.body);
  const result: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.create(connection, {
      body: prepared,
    });
  return result;
}
