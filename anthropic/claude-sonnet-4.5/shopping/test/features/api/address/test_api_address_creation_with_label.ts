import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer delivery address creation with custom label assignment.
 *
 * This test validates the complete workflow of a customer creating multiple
 * delivery addresses with user-defined labels for easy identification during
 * checkout. The test ensures that customers can organize their addresses with
 * meaningful labels like "Home", "Office", or "Parents House" and that the
 * system properly stores these labels while maintaining uniqueness
 * constraints.
 *
 * Test Flow:
 *
 * 1. Register a new customer account with valid credentials
 * 2. Create first delivery address with "Home" label
 * 3. Create second delivery address with "Office" label
 * 4. Verify both addresses are created successfully with proper data
 * 5. Validate address data integrity and label assignments
 */
export async function test_api_address_creation_with_label(
  connection: api.IConnection,
) {
  // Step 1: Register new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerData = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Validate customer registration response
  TestValidator.equals("customer email matches", customer.email, customerEmail);
  TestValidator.equals(
    "customer name matches",
    customer.name,
    customerData.name,
  );

  // Step 2: Create first address with "Home" label
  const homeAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(2)} Street`,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.pick([
      "CA",
      "NY",
      "TX",
      "FL",
      "WA",
      "IL",
      "PA",
      "OH",
      "GA",
      "NC",
    ] as const),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const homeAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: homeAddressData,
    });
  typia.assert(homeAddress);

  // Validate home address creation
  TestValidator.equals(
    "home address recipient matches",
    homeAddress.recipient_name,
    homeAddressData.recipient_name,
  );
  TestValidator.equals(
    "home address phone matches",
    homeAddress.phone_number,
    homeAddressData.phone_number,
  );
  TestValidator.equals(
    "home address line matches",
    homeAddress.address_line1,
    homeAddressData.address_line1,
  );

  // Step 3: Create second address with "Office" label
  const officeAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(2)} Avenue`,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.pick([
      "CA",
      "NY",
      "TX",
      "FL",
      "WA",
      "IL",
      "PA",
      "OH",
      "GA",
      "NC",
    ] as const),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const officeAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: officeAddressData,
    });
  typia.assert(officeAddress);

  // Validate office address creation
  TestValidator.equals(
    "office address recipient matches",
    officeAddress.recipient_name,
    officeAddressData.recipient_name,
  );
  TestValidator.equals(
    "office address phone matches",
    officeAddress.phone_number,
    officeAddressData.phone_number,
  );
  TestValidator.equals(
    "office address line matches",
    officeAddress.address_line1,
    officeAddressData.address_line1,
  );

  // Step 4: Verify both addresses have unique IDs
  TestValidator.notEquals(
    "address IDs are different",
    homeAddress.id,
    officeAddress.id,
  );
}
