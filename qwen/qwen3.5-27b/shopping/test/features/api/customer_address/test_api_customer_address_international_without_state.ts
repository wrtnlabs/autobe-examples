import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

/**
 * Test creating an international shipping address where state/province is not applicable.
 *
 * Validates that customers can create international addresses without state/province information, which is optional for countries that don't use regional subdivisions (e.g., France, UK). The test registers a new customer, authenticates them, and creates an address with state_province explicitly set to null.
 *
 * Special attention is given to verifying that the optional state_province field accepts null values and that the address is successfully persisted despite missing this field.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Create an international address (France) with state_province set to null.
 * 3. Validate the address response contains all required fields.
 * 4. Verify state_province is null in the created address.
 */
export async function test_api_customer_address_international_without_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create international address without state/province
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: "Marie Dubois",
        phone_number: "+33-1-23-45-67-89",
        street_address: "15 Rue de la Paix",
        city: "Paris",
        state_province: null,
        postal_code: "75002",
        country: "France",
      } satisfies IShoppingMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Validate address fields
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    "Marie Dubois",
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    "+33-1-23-45-67-89",
  );
  TestValidator.equals(
    "street address matches",
    address.street_address,
    "15 Rue de la Paix",
  );
  TestValidator.equals("city matches", address.city, "Paris");
  TestValidator.equals("state_province is null", address.state_province, null);
  TestValidator.equals("postal code matches", address.postal_code, "75002");
  TestValidator.equals("country matches", address.country, "France");
  TestValidator.equals("is_default is false", address.is_default, false);
  TestValidator.equals("deleted_at is null", address.deleted_at, null);
}
