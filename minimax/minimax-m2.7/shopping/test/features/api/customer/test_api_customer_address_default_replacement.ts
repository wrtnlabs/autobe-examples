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

export async function test_api_customer_address_default_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with known password for re-authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      password: testPassword,
    },
  });
  // 2. Create the first address with isDefault = true
  const firstAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "12345",
          country: "South Korea",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // 3. Verify the first address is created with is_default = true
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  // 4. Create a second address with isDefault = true (should replace default)
  const secondAddress =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: "Busan",
          state: "Haeundae-gu",
          postalCode: "67890",
          country: "South Korea",
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // 5. Verify the second address has is_default = true
  TestValidator.equals(
    "second address is default",
    secondAddress.is_default,
    true,
  );
  // 6. Re-authenticate to get updated addresses list and verify first address is no longer default
  const reAuthorizedConnection: api.IConnection = { host: connection.host };
  const reAuthorized = await authorize_customer_login(reAuthorizedConnection, {
    body: {
      email: authorized.email,
      password: testPassword,
      href: customerConnection.host + "/customers/login",
      referrer: customerConnection.host + "/customers/login",
    },
  });
  // 7. Find the first address in the updated list and verify is_default = false
  const updatedFirstAddress = reAuthorized.addresses.find(
    (addr) => addr.id === firstAddress.id,
  );
  TestValidator.notEquals(
    "first address found in list",
    updatedFirstAddress,
    undefined,
  );
  TestValidator.equals(
    "first address is no longer default",
    updatedFirstAddress!.isDefault,
    false,
  );
  // 8. Verify the second address remains the default address
  const updatedSecondAddress = reAuthorized.addresses.find(
    (addr) => addr.id === secondAddress.id,
  );
  TestValidator.notEquals(
    "second address found in list",
    updatedSecondAddress,
    undefined,
  );
  TestValidator.equals(
    "second address remains default",
    updatedSecondAddress!.isDefault,
    true,
  );
  // 9. Verify only one default address exists
  const defaultAddresses = reAuthorized.addresses.filter(
    (addr) => addr.isDefault,
  );
  TestValidator.equals("only one default address", defaultAddresses.length, 1);
  TestValidator.equals(
    "only second address is default",
    defaultAddresses[0].id,
    secondAddress.id,
  );
}