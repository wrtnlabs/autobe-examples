import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_shipping_address } from "../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Generate a random shipping address for the authenticated customer in E2E testing.
 *
 * Creates a new shipping address using the prepare function to generate valid test data,
 * then calls the creation endpoint. This function is used for testing address creation,
 * validation, and management in the e-commerce mall platform.
 *
 * The customer must be authenticated to access this endpoint. The address is automatically
 * associated with the authenticated customer's account.
 *
 * @param connection - API connection configuration
 * @param props.body - Optional DeepPartial override for specific address fields
 * @returns The newly created shipping address with generated UUID id
 */
export async function generate_random_ecommerce_mall_customer_customers_me_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallShippingAddress.ICreate>;
  },
): Promise<IEcommerceMallShippingAddress> {
  const prepared: IEcommerceMallShippingAddress.ICreate =
    prepare_random_ecommerce_mall_shipping_address(props.body);
  const result: IEcommerceMallShippingAddress =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
