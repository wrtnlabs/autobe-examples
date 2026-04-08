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
 * Generate a random mall platform shipping address via the API for E2E testing.
 *
 * Prepares a complete shipping address creation payload using the matching prepare function, then creates the persisted address through the customer shipping-address API.
 *
 * The created resource is returned exactly as the server persists it. No URL parameters are required for this operation.
 *
 * @param connection - API connection used to call the customer shipping address creation endpoint.
 * @param props - Optional body overrides used to prepare the shipping address creation payload.
 * @returns The created mall platform shipping address.
 */
export async function generate_random_mall_platform_customer_shipping_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShippingAddress.ICreate> | undefined;
  },
): Promise<IMallPlatformShippingAddress> {
  const prepared: IMallPlatformShippingAddress.ICreate =
    prepare_random_mall_platform_shipping_address(props.body);
  const result: IMallPlatformShippingAddress =
    await api.functional.mallPlatform.customer.shipping_addresses.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
