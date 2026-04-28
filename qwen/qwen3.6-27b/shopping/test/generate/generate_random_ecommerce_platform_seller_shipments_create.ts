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

import { prepare_random_ecommerce_platform_shipment } from "../prepare/prepare_random_ecommerce_platform_shipment";

/**
 * Generate a random shipment for E2E testing.
 *
 * Prepares random shipment data using the prepare function, then calls the creation endpoint to bundle order items with carrier tracking information.
 *
 * The generated shipment includes a carrier name, tracking number, and a list of order item IDs to bundle into the physical package.
 */
export async function generate_random_ecommerce_platform_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformShipment.ICreate>;
  },
): Promise<IEcommercePlatformShipment> {
  const prepared: IEcommercePlatformShipment.ICreate =
    prepare_random_ecommerce_platform_shipment(props.body);
  const result: IEcommercePlatformShipment =
    await api.functional.ecommercePlatform.seller.shipments.create(connection, {
      body: prepared,
    });
  return result;
}
