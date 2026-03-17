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
 * Test successful retrieval of a customer's own shipping address.
 *
 * Validates that a customer can retrieve their own shipping address by ID
 * and that all address fields match the originally created address.
 *
 * Steps:
 * 1. Register and authenticate a new customer account
 * 2. Create a shipping address for the authenticated customer
 * 3. Retrieve the address by ID
 * 4. Validate all fields match between created and retrieved address
 */
export async function test_api_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create a shipping address for the authenticated customer
  const createdAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(createdAddress);
  // Step 3: Retrieve the created address by ID
  const retrievedAddress =
    await api.functional.shoppingMall.customer.addresses.at(
      customerConnection,
      { addressId: createdAddress.id },
    );
  typia.assert(retrievedAddress);
  // Step 4: Validate retrieved address matches created address
  TestValidator.equals("id matches", retrievedAddress.id, createdAddress.id);
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipientName,
    createdAddress.recipientName,
  );
  TestValidator.equals(
    "phone number matches",
    retrievedAddress.phoneNumber,
    createdAddress.phoneNumber,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.streetAddress,
    createdAddress.streetAddress,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "state province matches",
    retrievedAddress.stateProvince,
    createdAddress.stateProvince,
  );
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postalCode,
    createdAddress.postalCode,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    createdAddress.country,
  );
  TestValidator.equals(
    "is default matches",
    retrievedAddress.isDefault,
    createdAddress.isDefault,
  );
  TestValidator.equals("deleted at is null", retrievedAddress.deletedAt, null);
}
