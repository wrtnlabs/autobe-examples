import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating a residential delivery address with proper address_type
 * classification.
 *
 * This test validates that buyers can create residential addresses correctly
 * classified for proper carrier delivery handling. It verifies that residential
 * addresses include appropriate fields for home delivery coordination such as
 * recipient name and contact phone.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a new buyer
 * 2. Create a residential delivery address with address_type='residential'
 * 3. Validate the address is created with correct address_type value
 * 4. Verify residential-specific delivery fields are properly set
 */
export async function test_api_buyer_address_residential_type(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerRegistration = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRegistration,
    });
  typia.assert(buyer);

  // Step 2: Create a residential delivery address
  const residentialAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    street_address_line2: `Apt ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`,
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions:
      "Please ring doorbell. Leave package at front door if no answer.",
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: residentialAddressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: Validate address_type is correctly set to 'residential'
  TestValidator.equals(
    "address type should be residential",
    createdAddress.address_type,
    "residential",
  );

  // Step 4: Verify residential-specific delivery fields
  TestValidator.equals(
    "recipient name matches input",
    createdAddress.recipient_name,
    residentialAddressData.recipient_name,
  );

  TestValidator.equals(
    "contact phone matches input",
    createdAddress.phone,
    residentialAddressData.phone,
  );

  TestValidator.equals(
    "address label matches input",
    createdAddress.address_label,
    residentialAddressData.address_label,
  );

  TestValidator.equals(
    "is default flag matches input",
    createdAddress.is_default,
    residentialAddressData.is_default,
  );

  TestValidator.equals(
    "special delivery instructions match input",
    createdAddress.special_delivery_instructions,
    residentialAddressData.special_delivery_instructions,
  );
}
