import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_shipment } from "../prepare/prepare_random_mall_platform_shipment";

/**
 * Generate a random mall platform shipment via the API for E2E testing.
 *
 * Prepares shipment creation data with the prepare function, then calls the
 * seller shipment creation endpoint to create the actual shipment resource.
 * The created shipment is returned so tests can immediately assert on its
 * tracking information and included order items.
 */
export async function generate_random_mall_platform_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShipment.ICreate> | undefined;
  },
): Promise<IMallPlatformShipment> {
  const prepared: IMallPlatformShipment.ICreate =
    prepare_random_mall_platform_shipment(props.body);
  return await api.functional.mallPlatform.seller.shipments.create(connection, {
    body: prepared,
  });
}
