import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_shipment_item } from "../prepare/prepare_random_mall_platform_shipment_item";

export async function generate_random_mall_platform_seller_shipments_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShipmentItem.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IMallPlatformShipment> {
  const prepared: IMallPlatformShipmentItem.ICreate =
    prepare_random_mall_platform_shipment_item(props.body);
  return await api.functional.mallPlatform.seller.shipments.items.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
