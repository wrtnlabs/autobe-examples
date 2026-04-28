import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_shipment_item } from "../prepare/prepare_random_ecommerce_platform_shipment_item";

/**
 * Generate a random ecommerce platform shipment item via the API for E2E testing.
 *
 * Prepares random shipment item data using the prepare function, which creates
 * an array of order item UUIDs to be bundled into a shipment. Then calls the
 * creation endpoint to add these order items to the specified shipment.
 *
 * Each order item added transitions from 'paid' to 'shipped' status. The
 * shipment ID must be provided as a URL parameter identifying the existing
 * shipment package receiving these items.
 */
export async function generate_random_ecommerce_platform_seller_shipments_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformShipmentItem.ICreate>;
    params?: {
      shipmentId: string;
    };
  },
): Promise<IEcommercePlatformShipmentItem> {
  const prepared: IEcommercePlatformShipmentItem.ICreate =
    prepare_random_ecommerce_platform_shipment_item(props.body);
  const result: IEcommercePlatformShipmentItem =
    await api.functional.ecommercePlatform.seller.shipments.items.create(
      connection,
      {
        shipmentId: props.params?.shipmentId!,
        body: prepared,
      },
    );
  return result;
}
