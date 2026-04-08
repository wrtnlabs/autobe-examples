import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_address } from "../prepare/prepare_random_ecommerce_address";

/**
 * Generate a random shipping address for the authenticated customer via the API.
 *
 * Creates a new shipping address by preparing random address data and calling the creation endpoint.
 * The address is automatically associated with the authenticated customer from the session.
 *
 * @param connection The API connection object
 * @param props.body Optional partial address data to override random values
 * @returns The created shipping address with generated ID and timestamps
 */
export async function generate_random_ecommerce_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAddress.ICreate>;
  },
): Promise<IEcommerceAddress> {
  const prepared: IEcommerceAddress.ICreate = prepare_random_ecommerce_address(
    props.body,
  );
  const result: IEcommerceAddress =
    await api.functional.ecommerce.customer.addresses.create(connection, {
      body: prepared,
    });
  return result;
}
