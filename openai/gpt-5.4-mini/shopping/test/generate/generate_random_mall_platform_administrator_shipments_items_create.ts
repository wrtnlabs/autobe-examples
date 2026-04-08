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
 * Generate a random mall platform shipment-item association via the API for E2E testing.
 *
 * Prepares valid shipment-item creation data using the prepare function, then calls the administrator shipment-items creation endpoint for the specified shipment. This is used to attach eligible order items to an existing shipment in integration tests.
 *
 * @param connection - API connection information
 * @param props - Partial shipment-item creation body and required shipment identifier
 * @returns The created shipment-item association
 */
export async function generate_random_mall_platform_administrator_shipments_items_create(
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
  return await api.functional.mallPlatform.administrator.shipments.items.create(
    connection,
    {
      body: prepared,
      shipmentId: props.params.shipmentId,
    },
  );
}
