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
 * Test customer switching their default shipping address between two saved addresses.
 *
 * Validates that when a customer sets a new default shipping address, the system correctly transfers the default designation from the previous default address to the newly selected one. Only one address per customer can be the default at any time, enforced by a unique partial constraint.
 *
 * Verifies the complete switch behavior: the new default address returns with is_default = true, confirming the default designation was properly transferred.
 *
 * 1. Register and authenticate a new customer.
 * 2. Create a first shipping address as the current default (isDefault = true).
 * 3. Create a second shipping address as a non-default address (isDefault = false).
 * 4. Validate initial default status: first address is default, second is not.
 * 5. Call setDefault with the second address's UUID to switch the default designation.
 * 6. Validate the setDefault response returns the second address with is_default = true.
 * 7. Verify the customer profile association is maintained on the newly defaulted address.
 */
export async function test_api_customer_switch_default_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create first shipping address as the current default
  const firstAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(firstAddress);
  // 3. Create second shipping address as non-default
  const secondAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: false } },
    );
  typia.assert(secondAddress);
  // 4. Validate initial default status
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  TestValidator.equals(
    "second address is not default",
    secondAddress.is_default,
    false,
  );
  // 5. Switch default to the second address
  const switchBody = {
    addressId: secondAddress.id,
  } satisfies IEcommercePlatformShippingAddress.ISetDefault;
  const newDefaultAddress =
    await api.functional.ecommercePlatform.customer.addresses._default.setDefault(
      customerConnection,
      { body: switchBody },
    );
  typia.assert(newDefaultAddress);
  // 6. Validate the new default address response
  TestValidator.equals(
    "new default address has is_default true",
    newDefaultAddress.is_default,
    true,
  );
  TestValidator.equals(
    "switched default matches second address ID",
    newDefaultAddress.id,
    secondAddress.id,
  );
  // 7. Verify customer profile association is maintained
  TestValidator.equals(
    "customer profile ID matches",
    newDefaultAddress.customerProfile.id,
    secondAddress.customerProfile.id,
  );
}
