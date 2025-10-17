import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete workflow of a customer deleting their delivery address
 * using soft deletion.
 *
 * This test validates the full lifecycle of address management including:
 *
 * 1. Customer registration and authentication to establish a valid session
 * 2. Creation of a delivery address to have an address record for testing
 * 3. Soft deletion of the created address
 * 4. Verification that the operation completes successfully
 *
 * The soft delete approach ensures that address data is preserved in the
 * database for historical order references and audit trails, while removing it
 * from the customer's active address list. The system also handles ownership
 * validation to prevent customers from deleting addresses belonging to other
 * users.
 */
export async function test_api_customer_address_deletion_soft_delete(
  connection: api.IConnection,
) {
  // Step 1: Customer registers and authenticates
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

  // Step 2: Customer creates a delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
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

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Verify address was created with correct data
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    addressData.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    addressData.phone_number,
  );
  TestValidator.equals(
    "address line matches",
    address.address_line1,
    addressData.address_line1,
  );

  // Step 3: Customer deletes the address (soft delete)
  await api.functional.shoppingMall.customer.addresses.erase(connection, {
    addressId: address.id,
  });
}
