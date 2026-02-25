import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_address_multiple_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection through registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: "12341234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://google.com/search",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuthorized);
  // 2. Create multiple addresses with varying data
  const addresses: IShoppingMallCustomerAddress[] = [];
  const countries = [
    "United States",
    "United Kingdom",
    "Japan",
    "Germany",
    "France",
  ];
  const phoneFormats = [
    RandomGenerator.mobile(),
    "+1-555-123-4567",
    "+44 20 7123 4567",
    "+81-3-1234-5678",
  ];
  const postalFormats = [
    "100-0001",
    "SW1A 1AA",
    "12345",
    "12345-6789",
    "75000",
  ];
  for (let i = 0; i < 5; i++) {
    const addressData = {
      recipient_name: RandomGenerator.name(),
      phone_number: phoneFormats[i % phoneFormats.length],
      street_address: `${RandomGenerator.alphabets(4)} ${RandomGenerator.alphabets(8)} St`,
      city: RandomGenerator.name(2),
      state: RandomGenerator.alphabets(2).toUpperCase(),
      postal_code: postalFormats[i % postalFormats.length],
      country: countries[i % countries.length],
    } satisfies IShoppingMallCustomerAddress.ICreate;
    const createdAddress =
      await api.functional.shoppingMall.customer.addresses.create(
        customerConnection,
        { body: addressData },
      );
    typia.assert(createdAddress);
    addresses.push(createdAddress);
  }
  // 3. Verify all addresses were created successfully
  TestValidator.equals("created 5 addresses", addresses.length, 5);
  // 4. Verify each address has required fields
  addresses.forEach((address, index) => {
    typia.assert<IShoppingMallCustomerAddress>(address);
    TestValidator.equals(
      `address ${index} recipient name`,
      typeof address.recipientName,
      "string",
    );
    TestValidator.equals(
      `address ${index} phone number`,
      typeof address.phoneNumber,
      "string",
    );
    TestValidator.equals(
      `address ${index} street address`,
      typeof address.streetAddress,
      "string",
    );
    TestValidator.equals(
      `address ${index} city`,
      typeof address.city,
      "string",
    );
    TestValidator.equals(
      `address ${index} state`,
      typeof address.state,
      "string",
    );
    TestValidator.equals(
      `address ${index} postal code`,
      typeof address.postalCode,
      "string",
    );
    TestValidator.equals(
      `address ${index} country`,
      typeof address.country,
      "string",
    );
  });
  // 5. Verify timestamps exist and are valid ISO 8601 format
  addresses.forEach((address, index) => {
    const createdAtValid = address.createdAt !== null && address.createdAt !== undefined;
    TestValidator.equals(
      `address ${index} has valid created_at`,
      createdAtValid,
      true,
    );
    if (createdAtValid) {
      const createdAtDate = new Date(address.createdAt);
      TestValidator.equals(
        `address ${index} created_at valid date`,
        isNaN(createdAtDate.getTime()),
        false,
      );
    }
    const updatedAtValid = address.updatedAt !== null && address.updatedAt !== undefined;
    TestValidator.equals(
      `address ${index} has valid updated_at`,
      updatedAtValid,
      true,
    );
    if (updatedAtValid) {
      const updatedAtDate = new Date(address.updatedAt);
      TestValidator.equals(
        `address ${index} updated_at valid date`,
        isNaN(updatedAtDate.getTime()),
        false,
      );
    }
  });
  // 6. Verify customer object is properly populated
  addresses.forEach((address, index) => {
    TestValidator.equals(
      `address ${index} customer has id`,
      typeof address.customer.id,
      "string",
    );
    TestValidator.equals(
      `address ${index} customer has email`,
      typeof address.customer.email,
      "string",
    );
    const emailValid = address.customer.email !== null && address.customer.email !== undefined;
    TestValidator.equals(
      `address ${index} email is defined`,
      emailValid,
      true,
    );
    if (emailValid) {
      TestValidator.equals(
        `address ${index} customer email format`,
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.customer.email),
        true,
      );
    }
  });
}