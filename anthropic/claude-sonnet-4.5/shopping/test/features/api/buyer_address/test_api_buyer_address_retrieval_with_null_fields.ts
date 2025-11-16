import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test retrieving an address with optional null fields.
 *
 * This test validates the correct handling of nullable fields in the address
 * data structure. It creates a buyer account, adds an address with minimal
 * required fields where optional fields are set to null, then retrieves the
 * address to verify null fields are properly represented in the response.
 *
 * Steps:
 *
 * 1. Create a new buyer account
 * 2. Create an address with minimal required fields and null optional fields
 * 3. Retrieve the address by ID
 * 4. Verify the address data matches what was created
 * 5. Verify null optional fields are correctly represented
 */
export async function test_api_buyer_address_retrieval_with_null_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Create an address with minimal required fields and null optional fields
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
    street_address_line2: null,
    city: RandomGenerator.name(1),
    state: null,
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: null,
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: Retrieve the address by ID
  const retrievedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.at(connection, {
      addressId: createdAddress.id,
    });
  typia.assert(retrievedAddress);

  // Step 4: Verify the address data matches what was created
  TestValidator.equals(
    "retrieved address ID matches created",
    retrievedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipient_name,
    addressData.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    retrievedAddress.phone,
    addressData.phone,
  );
  TestValidator.equals(
    "street address line 1 matches",
    retrievedAddress.street_address_line1,
    addressData.street_address_line1,
  );
  TestValidator.equals("city matches", retrievedAddress.city, addressData.city);
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postal_code,
    addressData.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    addressData.country,
  );
  TestValidator.equals(
    "address label matches",
    retrievedAddress.address_label,
    addressData.address_label,
  );
  TestValidator.equals(
    "address type matches",
    retrievedAddress.address_type,
    addressData.address_type,
  );
  TestValidator.equals(
    "is_default matches",
    retrievedAddress.is_default,
    addressData.is_default,
  );

  // Step 5: Verify null optional fields are correctly represented
  TestValidator.equals(
    "street_address_line2 is null",
    retrievedAddress.street_address_line2,
    null,
  );
  TestValidator.equals("state is null", retrievedAddress.state, null);
  TestValidator.equals(
    "special_delivery_instructions is null",
    retrievedAddress.special_delivery_instructions,
    null,
  );
}
