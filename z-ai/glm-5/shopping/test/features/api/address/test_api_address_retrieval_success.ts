import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test successful retrieval of a specific shipping address by the authenticated customer.
 *
 * Prerequisites:
 * 1. Customer authentication via POST /shoppingMall/auth/customer/join
 * 2. Address creation via POST /shoppingMall/customer/addresses
 *
 * Test Steps:
 * 1. Register and authenticate a customer
 * 2. Create a shipping address
 * 3. Retrieve the address by ID
 * 4. Verify the retrieved address matches the created address
 */
export async function test_api_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a shipping address
  const createdAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(createdAddress);
  // 3. Retrieve the address by ID
  const retrievedAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Verify the retrieved address matches the created address
  TestValidator.equals("address id", retrievedAddress.id, createdAddress.id);
  TestValidator.equals(
    "recipient name",
    retrievedAddress.recipientName,
    createdAddress.recipientName,
  );
  TestValidator.equals(
    "phone number",
    retrievedAddress.phoneNumber,
    createdAddress.phoneNumber,
  );
  TestValidator.equals(
    "street address",
    retrievedAddress.streetAddress,
    createdAddress.streetAddress,
  );
  TestValidator.equals("city", retrievedAddress.city, createdAddress.city);
  TestValidator.equals(
    "state province",
    retrievedAddress.stateProvince,
    createdAddress.stateProvince,
  );
  TestValidator.equals(
    "postal code",
    retrievedAddress.postalCode,
    createdAddress.postalCode,
  );
  TestValidator.equals(
    "country",
    retrievedAddress.country,
    createdAddress.country,
  );
  TestValidator.equals(
    "is default",
    retrievedAddress.isDefault,
    createdAddress.isDefault,
  );
  TestValidator.equals(
    "customer id",
    retrievedAddress.customer.id,
    createdAddress.customer.id,
  );
  TestValidator.predicate(
    "deletedAt is null for active address",
    retrievedAddress.deletedAt === null,
  );
}
