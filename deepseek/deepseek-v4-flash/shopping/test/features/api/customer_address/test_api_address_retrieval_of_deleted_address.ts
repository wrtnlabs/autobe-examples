import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Test that retrieving a soft-deleted shipping address returns 404 Not Found.
 *
 * Validates that the address retrieval endpoint properly excludes soft-deleted records by filtering on `deleted_at IS NULL`. After a customer creates a shipping address and then deletes it, attempting to retrieve the same address by its ID must result in a 404 error.
 *
 * 1. Customer joins the platform via `authorize_customer_join`.
 * 2. Customer creates a shipping address via `generate_random_e_commerce_mall_customer_addresses_create`.
 * 3. Customer deletes the address via `api.functional.eCommerceMall.customer.addresses.erase` (soft-delete with `deleted_at` timestamp).
 * 4. Customer attempts to retrieve the deleted address via `api.functional.eCommerceMall.customer.addresses.at`, expecting HTTP 404.
 */
export async function test_api_address_retrieval_of_deleted_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Delete the address (soft-delete)
  await api.functional.eCommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // 4. Attempt to retrieve the deleted address - expect 404
  await TestValidator.httpError("retrieve deleted address", 404, async () => {
    await api.functional.eCommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  });
}
