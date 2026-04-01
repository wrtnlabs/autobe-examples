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

import { prepare_random_mall_platform_shipment } from "../prepare/prepare_random_mall_platform_shipment";

export async function generate_random_mall_platform_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShipment.ICreate> | undefined;
  },
): Promise<IMallPlatformShipment> {
  const prepared: IMallPlatformShipment.ICreate =
    prepare_random_mall_platform_shipment(props.body);
  const result: IMallPlatformShipment =
    await api.functional.mallPlatform.seller.shipments.create(connection, {
      body: prepared,
    });
  return result;
}
