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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_order } from "../prepare/prepare_random_mall_platform_order";

/**
 * Generate a random mall platform order force-cancel request via the API for E2E testing.
 *
 * Prepares valid administrator intervention data using the prepare function, then calls the force-cancel endpoint for the specified order. The created response preserves the updated order state after the cancellation is applied.
 *
 * This function is intended for end-to-end test setup and always delegates request body construction to the prepare_random_mall_platform_order helper.
 *
 * @param connection Connection to the API server.
 * @param props Input body and required order URL parameter.
 * @returns The updated order returned by the force-cancel operation.
 */
export async function generate_random_mall_platform_administrator_orders_force_cancel_force_cancel(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformOrder.ICreate> | undefined;
    params: {
      orderId: string;
    };
  },
): Promise<IMallPlatformOrder> {
  const prepared: IMallPlatformOrder.ICreate =
    prepare_random_mall_platform_order(props.body);
  return await api.functional.mallPlatform.administrator.orders.force_cancel.forceCancel(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
    },
  );
}
