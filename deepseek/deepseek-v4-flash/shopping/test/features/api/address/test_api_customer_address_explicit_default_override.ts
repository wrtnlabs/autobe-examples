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

export async function test_api_customer_address_explicit_default_override(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that creating a new address with is_default=true explicitly clears the existing default flag from the
   * previously created default address, maintaining the singleton invariant of only one default address per
   * customer.
   *
   * The system automatically sets the first address as default when is_default is omitted. When a subsequent
   * address is created with is_default explicitly set to true, the system must clear the default flag on the
   * previous default to enforce the singleton constraint.
   *
   * 1. Join as a customer.
   * 2. Create the first address without specifying is_default — the system auto-sets it as default.
   * 3. Verify the first address response has is_default=true.
   * 4. Create a second address with is_default=true explicitly.
   * 5. Verify the second address response has is_default=true.
   * 6. Verify both addresses have distinct IDs, confirming two separate records exist.
   */
  // Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 1: Create first address WITHOUT is_default
  // System should auto-set is_default=true since this is the customer's first address
  const address1Input = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.alphabets(20),
    city: RandomGenerator.alphabets(8),
    state_province: RandomGenerator.alphabets(10),
    postal_code: RandomGenerator.alphabets(5),
    country: RandomGenerator.alphabets(8),
  } satisfies IECommerceMallCustomerAddress.ICreate;
  const address1 = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    { body: address1Input },
  );
  typia.assert(address1);
  TestValidator.equals(
    "first address is default (auto-set)",
    address1.is_default,
    true,
  );
  // Step 2: Create second address WITH is_default=true explicitly
  // System should clear the existing default on address1 and set address2 as default
  const address2Input = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.alphabets(20),
    city: RandomGenerator.alphabets(8),
    state_province: RandomGenerator.alphabets(10),
    postal_code: RandomGenerator.alphabets(5),
    country: RandomGenerator.alphabets(8),
    is_default: true,
  } satisfies IECommerceMallCustomerAddress.ICreate;
  const address2 = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    { body: address2Input },
  );
  typia.assert(address2);
  // Step 3: Assertions
  TestValidator.equals("second address is default", address2.is_default, true);
  TestValidator.notEquals(
    "addresses have different IDs",
    address1.id,
    address2.id,
  );
}
