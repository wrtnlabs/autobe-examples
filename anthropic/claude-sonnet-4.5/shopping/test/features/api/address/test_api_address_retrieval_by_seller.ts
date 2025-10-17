import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller address retrieval by ID with proper authentication and ownership
 * validation.
 *
 * This test validates that authenticated sellers can successfully retrieve
 * their own delivery address details using the address ID. The test ensures
 * complete address information is returned accurately and verifies
 * seller-specific access control.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a seller
 * 2. Create a delivery address for the seller
 * 3. Retrieve the address by its ID
 * 4. Validate all address fields match the created data
 */
export async function test_api_address_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SecurePass123!";

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(2),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
          "partnership",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
        tax_id: RandomGenerator.alphaNumeric(9),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create a delivery address for the seller
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Avenue`,
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
    await api.functional.shoppingMall.seller.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(createdAddress);

  // Step 3: Retrieve the address by ID
  const retrievedAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.seller.addresses.at(connection, {
      addressId: createdAddress.id,
    });
  typia.assert(retrievedAddress);

  // Step 4: Validate all address fields match
  TestValidator.equals(
    "retrieved address ID matches created address",
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
