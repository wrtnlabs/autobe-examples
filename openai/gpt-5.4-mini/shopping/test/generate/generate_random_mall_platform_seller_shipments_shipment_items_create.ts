import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_shipment_item } from "../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Generate a random shipment-item assignment via the API for E2E testing.
 *
 * Prepares random shipment-item creation data using the prepare function, then
 * attaches the specified order items to the target shipment through the seller
 * shipment-items endpoint.
 *
 * The shipment identifier must be provided in params because the endpoint
 * creates item assignments for an existing shipment header. Any caller-provided
 * body values are preserved and merged by the prepare function before the API
 * request is sent.
 */
export async function generate_random_mall_platform_seller_shipments_shipment_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShipmentItem.ICreate> | undefined;
    params: {
      shipmentId: string;
    };
  },
): Promise<IMallPlatformShipmentItem> {
  const prepared: IMallPlatformShipmentItem.ICreate =
    prepare_random_mall_platform_shipment_item(props.body);
  return await api.functional.mallPlatform.seller.shipments.shipmentItems.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
