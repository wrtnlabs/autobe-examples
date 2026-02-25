import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment_confirmation } from "../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function generate_random_shopping_mall_customer_shipment_confirmations_create_shipment_confirmation(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipmentConfirmation.ICreate> | undefined;
  },
): Promise<IShoppingMallShipmentConfirmation> {
  const prepared: IShoppingMallShipmentConfirmation.ICreate =
    prepare_random_shopping_mall_shipment_confirmation(props.body);
  const result: IShoppingMallShipmentConfirmation =
    await api.functional.shoppingMall.customer.shipmentConfirmations.createShipmentConfirmation(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
