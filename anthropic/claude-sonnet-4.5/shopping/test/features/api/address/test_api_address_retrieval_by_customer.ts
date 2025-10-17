import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer address retrieval by ID.
 *
 * This test validates that authenticated customers can successfully retrieve
 * their own delivery address details by address ID. It ensures:
 *
 * - Customer registration and authentication works correctly
 * - Address creation returns valid address data
 * - Address retrieval by ID returns the correct address
 * - All address fields are properly populated and match the created data
 *
 * Workflow:
 *
 * 1. Register new customer account
 * 2. Create a delivery address
 * 3. Retrieve the address by ID
 * 4. Validate retrieved address matches created address
 */
export async function test_api_address_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123!";

  const customerData = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 2: Create a delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const createdAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(createdAddress);

  // Step 3: Retrieve the address by ID
  const retrievedAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.at(connection, {
      addressId: createdAddress.id,
    });
  typia.assert(retrievedAddress);

  // Step 4: Validate retrieved address matches created address
  TestValidator.equals(
    "retrieved address ID matches created address ID",
    retrievedAddress.id,
    createdAddress.id,
  );

  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipient_name,
    addressData.recipient_name,
  );

  TestValidator.equals(
    "phone number matches",
    retrievedAddress.phone_number,
    addressData.phone_number,
  );

  TestValidator.equals(
    "address line 1 matches",
    retrievedAddress.address_line1,
    addressData.address_line1,
  );
}
