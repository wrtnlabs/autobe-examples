import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_shipment_item } from "../prepare/prepare_random_mall_platform_shipment_item";

/**
 * Generate a random shipment item via the API for E2E testing.
 *
 * Prepares valid shipment-item creation data using the prepare function, then attaches the selected order items to an existing shipment through the seller shipment-items creation endpoint.
 *
 * The shipment identifier must be provided through props.params.shipmentId because this API operation targets an existing shipment path parameter. Any optional body overrides are forwarded to the prepare function before the request is sent.
 */
export async function generate_random_mall_platform_seller_shipments_items_create(
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
  return await api.functional.mallPlatform.seller.shipments.items.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
