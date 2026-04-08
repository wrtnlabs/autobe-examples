import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_address_deletion_default_no_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword,
    },
  });
  typia.assert(authorized);
  // 2. Create first address with isDefault=false
  const firstAddressInput = prepare_random_ecommerce_mall_shipping_address();
  firstAddressInput.isDefault = false;
  const firstAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: firstAddressInput satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // 3. Create second address with isDefault=true (this becomes the default)
  const secondAddressInput = prepare_random_ecommerce_mall_shipping_address();
  secondAddressInput.isDefault = true;
  const secondAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: secondAddressInput satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // 4. Verify second address is designated as default
  TestValidator.equals(
    "second address is default",
    secondAddress.is_default,
    true,
  );
  TestValidator.equals(
    "first address is not default",
    firstAddress.is_default,
    false,
  );
  // 5. Delete the default address via DELETE /ecommerceMall/customer/addresses/{defaultAddressId}
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: secondAddress.id,
    },
  );
  // 6. Re-authenticate to get updated address list (no direct list endpoint available)
  const reauthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerConnection, {
      body: {
        email: authorized.email,
        password: customerPassword,
        href: "https://example.com/profile",
        referrer: "https://example.com/home",
      },
    });
  typia.assert(reauthorized);
  // 7. Verify remaining addresses:
  // - First address still exists
  // - First address is NOT automatically promoted to default
  // - No address is designated as default
  const remainingAddresses = reauthorized.addresses;
  const firstAddressStillExists = remainingAddresses.some(
    (addr) => addr.id === firstAddress.id,
  );
  TestValidator.equals(
    "first address still exists",
    firstAddressStillExists,
    true,
  );
  // Find the remaining address and verify it's not promoted to default
  const remainingAddress = remainingAddresses.find(
    (addr) => addr.id === firstAddress.id,
  );
  if (remainingAddress) {
    TestValidator.equals(
      "remaining address is NOT promoted to default",
      remainingAddress.isDefault,
      false,
    );
  }
  // Verify no address is designated as default
  const hasDefaultAddress = remainingAddresses.some(
    (addr) => addr.isDefault === true,
  );
  TestValidator.equals(
    "no address is designated as default",
    hasDefaultAddress,
    false,
  );
}