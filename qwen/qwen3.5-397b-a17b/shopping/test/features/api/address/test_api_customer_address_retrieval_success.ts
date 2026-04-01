import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test customer address retrieval success path.
 * 1. Customer registers and logs in
 * 2. Customer creates a shipping address
 * 3. Customer retrieves the address by ID
 * 4. Validate all address fields are correctly returned
 */
export async function test_api_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postalCode: typia.random<string>(),
        country: RandomGenerator.name(1),
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Retrieve address by ID
  const retrievedAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate address fields
  TestValidator.equals("address ID matches", retrievedAddress.id, address.id);
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "recipient phone matches",
    retrievedAddress.recipient_phone,
    address.recipient_phone,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.street_address,
    address.street_address,
  );
  TestValidator.equals("city matches", retrievedAddress.city, address.city);
  TestValidator.equals("state matches", retrievedAddress.state, address.state);
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postal_code,
    address.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    address.country,
  );
  TestValidator.equals(
    "is_default matches",
    retrievedAddress.is_default,
    address.is_default,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedAddress.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "address is not deleted",
    retrievedAddress.deleted_at === null,
  );
}
