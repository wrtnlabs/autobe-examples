import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_tracking_info } from "../prepare/prepare_random_shopping_mall_tracking_info";

export async function generate_random_shopping_mall_seller_shipments_tracking_infos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallTrackingInfo.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IShoppingMallTrackingInfo> {
  const prepared: IShoppingMallTrackingInfo.ICreate =
    prepare_random_shopping_mall_tracking_info(props.body);
  const result: IShoppingMallTrackingInfo =
    await api.functional.shoppingMall.seller.shipments.trackingInfos.create(
      connection,
      {
        shipmentId: props.params.shipmentId,
        body: prepared,
      },
    );
  return result;
}
