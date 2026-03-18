import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment_confirmation } from "../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function generate_random_shopping_mall_member_shipments_confirmations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipmentConfirmation.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IShoppingMallShipmentConfirmation> {
  const prepared: IShoppingMallShipmentConfirmation.ICreate =
    prepare_random_shopping_mall_shipment_confirmation(props.body);
  return await api.functional.shoppingMall.member.shipments.confirmations.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
