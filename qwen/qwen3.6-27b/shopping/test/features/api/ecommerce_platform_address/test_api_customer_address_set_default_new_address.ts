import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test setting a newly created shipping address as the customer's default address.
 *
 * Validates the complete workflow of registering a new customer account, creating a shipping address without default status, and then designating it as the default via the dedicated setDefault endpoint. Ensures that the address is correctly updated with default status and that the response reflects the change accurately.
 *
 * Special attention is given to verifying that the setDefault operation correctly sets is_default to true and returns the updated address record with all fields populated.
 *
 * 1. Register as a new customer with randomized email and password credentials.
 * 2. Create a new shipping address with all geographic details and isDefault set to false.
 * 3. Set the newly created address as the customer's default by calling the setDefault endpoint.
 * 4. Validate that the response has is_default set to true and the address id matches the original address.
 */
export async function test_api_customer_address_set_default_new_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create a new shipping address (not default)
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address);
  TestValidator.equals(
    "address is not default initially",
    address.is_default,
    false,
  );
  // 3. Set the new address as default
  const body = {
    addressId: address.id,
  } satisfies IEcommercePlatformShippingAddress.ISetDefault;
  const updatedAddress =
    await api.functional.ecommercePlatform.customer.addresses._default.setDefault(
      customerConnection,
      { body },
    );
  typia.assert(updatedAddress);
  // 4. Validate the default status was set correctly
  TestValidator.equals(
    "address is now default",
    updatedAddress.is_default,
    true,
  );
  TestValidator.equals("address id matches", updatedAddress.id, address.id);
}
