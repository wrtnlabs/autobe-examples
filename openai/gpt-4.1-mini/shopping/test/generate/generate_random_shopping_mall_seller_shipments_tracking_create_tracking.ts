import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_shipment_tracking } from "../prepare/prepare_random_shopping_mall_shipment_tracking";

export async function generate_random_shopping_mall_seller_shipments_tracking_create_tracking(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShipmentTracking.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IShoppingMallShipmentTracking> {
  const prepared: IShoppingMallShipmentTracking.ICreate =
    prepare_random_shopping_mall_shipment_tracking(props.body);
  const result: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.seller.shipments.tracking.createTracking(
      connection,
      {
        shipmentId: props.params.shipmentId,
        body: prepared,
      },
    );
  return result;
}
