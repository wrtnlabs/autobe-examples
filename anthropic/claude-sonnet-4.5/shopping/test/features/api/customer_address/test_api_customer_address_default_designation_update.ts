import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer address creation and update functionality.
 *
 * This test validates the basic address management workflow for customers:
 *
 * 1. Customer registration and authentication
 * 2. Creating multiple delivery addresses
 * 3. Updating an existing address with new recipient and city information
 * 4. Verifying the update was applied correctly
 *
 * Note: The original scenario requested testing default address designation
 * behavior, but the available IShoppingMallAddress DTO does not expose
 * is_default property in either the response type or the update type.
 * Therefore, this test focuses on the available functionality: creating
 * addresses and updating their recipient_name and city fields.
 */
export async function test_api_customer_address_default_designation_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 2: Create the first delivery address
  const firstAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
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

  const firstAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: firstAddressData,
    });
  typia.assert(firstAddress);

  TestValidator.equals(
    "first address recipient name matches",
    firstAddress.recipient_name,
    firstAddressData.recipient_name,
  );

  // Step 3: Create the second delivery address
  const secondAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
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

  const secondAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: secondAddressData,
    });
  typia.assert(secondAddress);

  TestValidator.equals(
    "second address recipient name matches",
    secondAddress.recipient_name,
    secondAddressData.recipient_name,
  );

  // Step 4: Update the second address with new recipient name and city
  const newRecipientName = RandomGenerator.name();
  const newCity = RandomGenerator.name(1);

  const updateData = {
    recipient_name: newRecipientName,
    city: newCity,
  } satisfies IShoppingMallAddress.IUpdate;

  const updatedSecondAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.update(connection, {
      addressId: secondAddress.id,
      body: updateData,
    });
  typia.assert(updatedSecondAddress);

  // Step 5: Verify the update was applied correctly
  TestValidator.equals(
    "updated address ID matches original",
    updatedSecondAddress.id,
    secondAddress.id,
  );

  TestValidator.equals(
    "updated address has new recipient name",
    updatedSecondAddress.recipient_name,
    newRecipientName,
  );

  // Verify other fields remain unchanged
  TestValidator.equals(
    "updated address phone number unchanged",
    updatedSecondAddress.phone_number,
    secondAddress.phone_number,
  );

  TestValidator.equals(
    "updated address line1 unchanged",
    updatedSecondAddress.address_line1,
    secondAddress.address_line1,
  );
}
