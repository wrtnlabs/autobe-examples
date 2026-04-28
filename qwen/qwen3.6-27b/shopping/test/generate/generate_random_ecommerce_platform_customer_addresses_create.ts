import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_shipping_address } from "../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Generate a random shipping address for the authenticated customer's account for E2E testing.
 *
 * Prepares random shipping address data using the prepare function, then calls the creation endpoint.
 * The new address is automatically associated with the authenticated customer's profile.
 */
export async function generate_random_ecommerce_platform_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformShippingAddress.ICreate> | undefined;
  },
): Promise<IEcommercePlatformShippingAddress> {
  const prepared: IEcommercePlatformShippingAddress.ICreate =
    prepare_random_ecommerce_platform_shipping_address(props.body);
  return await api.functional.ecommercePlatform.customer.addresses.create(
    connection,
    {
      body: prepared,
    },
  );
}
