import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
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

export async function test_api_customer_address_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create a new address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  // 3. Retrieve the created address
  const retrievedAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate all address fields, including customer_id
  TestValidator.equals("address ID matches", retrievedAddress.id, address.id);
  TestValidator.equals(
    "address recipient matches",
    retrievedAddress.recipient,
    address.recipient,
  );
  TestValidator.equals(
    "address street matches",
    retrievedAddress.street,
    address.street,
  );
  TestValidator.equals(
    "address city matches",
    retrievedAddress.city,
    address.city,
  );
  TestValidator.equals(
    "address postal code matches",
    retrievedAddress.postal_code,
    address.postal_code,
  );
  TestValidator.equals(
    "address country code matches",
    retrievedAddress.country_code,
    address.country_code,
  );
  TestValidator.equals(
    "address is_default matches",
    retrievedAddress.is_default,
    address.is_default,
  );
  // Additional validation for customer_id as required by business logic
  TestValidator.equals(
    "address belongs to the correct customer",
    retrievedAddress.customer_id,
    address.customer_id,
  );
  TestValidator.equals(
    "address should be marked as default (one address created)",
    address.is_default,
    true,
  );
}
