import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";

import { prepare_random_ecommerce_mall_customer_address } from "../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Generate a random customer shipping address for E2E testing.
 *
 * Prepares random address data using the prepare function, then creates the
 * address via the API for the authenticated customer. The authenticated
 * customer's identity is automatically associated from the JWT session token.
 *
 * The 'is_default' field in the input is optional; when omitted, the system
 * automatically determines whether to set it as the default based on the
 * customer's existing addresses. If explicitly set to 'true', any existing
 * default address for this customer is automatically cleared.
 */
export async function generate_random_e_commerce_mall_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallCustomerAddress.ICreate> | undefined;
  }
): Promise<IECommerceMallCustomerAddress> {
  const prepared: IECommerceMallCustomerAddress.ICreate = prepare_random_ecommerce_mall_customer_address(
    props.body
  );
  return await api.functional.eCommerceMall.customer.addresses.create(
    connection,
    {
      body: prepared,
    },
  );
}