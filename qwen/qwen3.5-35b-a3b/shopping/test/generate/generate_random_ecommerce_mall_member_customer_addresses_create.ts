import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_customer_address } from "../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Generate a random customer shipping address via the API for E2E testing.
 *
 * Prepares random address data using the prepare function, then calls the creation endpoint
 * to create a new shipping address for the authenticated customer. The created address
 * includes all required fields like recipient name, phone, street address, and location
 * details. If is_default is set to true, this address will become the customer's
 * primary shipping address.
 */
export async function generate_random_ecommerce_mall_member_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCustomerAddress.ICreate> | undefined;
  },
): Promise<IEcommerceMallCustomerAddress> {
  const prepared: IEcommerceMallCustomerAddress.ICreate =
    prepare_random_ecommerce_mall_customer_address(props.body);
  const result: IEcommerceMallCustomerAddress =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
