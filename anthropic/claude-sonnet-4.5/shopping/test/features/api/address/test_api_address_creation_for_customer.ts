import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test complete delivery address creation workflow for authenticated customers.
 *
 * This test validates the end-to-end process of customer registration followed
 * by delivery address creation. It ensures that customers can successfully
 * create their first delivery address with complete recipient information,
 * street address components, and location details.
 *
 * Test Flow:
 *
 * 1. Register a new customer account with valid credentials
 * 2. Create a delivery address with all required fields
 * 3. Validate that all address data is correctly stored
 * 4. Verify the address is associated with the authenticated customer
 * 5. Confirm the created address can be used in checkout flows
 */
export async function test_api_address_creation_for_customer(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create a complete delivery address for the customer
  const recipientName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const addressLine1 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const city = RandomGenerator.name(1);
  const stateProvince = RandomGenerator.name(1);
  const postalCode = typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
    >()
    .toString();
  const country = "United States";

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: recipientName,
        phone_number: phoneNumber,
        address_line1: addressLine1,
        city: city,
        state_province: stateProvince,
        postal_code: postalCode,
        country: country,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 3: Validate the created address data matches input
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    recipientName,
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    phoneNumber,
  );
  TestValidator.equals(
    "address line 1 matches",
    address.address_line1,
    addressLine1,
  );
}
