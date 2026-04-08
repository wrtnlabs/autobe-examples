import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_shipping_address } from "../prepare/prepare_random_mall_platform_shipping_address";

/**
 * Generate a random shipping address for the authenticated customer via the API.
 *
 * Prepares shipping address creation data with the dedicated prepare function,
 * then creates the saved address through the customer shipping address endpoint.
 * The created address is returned for reuse in E2E test scenarios.
 */
export async function generate_random_mall_platform_customer_shipping_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShippingAddress.ICreate> | undefined;
  },
): Promise<IMallPlatformShippingAddress> {
  const prepared: IMallPlatformShippingAddress.ICreate =
    prepare_random_mall_platform_shipping_address(props.body);
  return await api.functional.mallPlatform.customer.shipping_addresses.create(
    connection,
    {
      body: prepared,
    },
  );
}
