import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete workflow of a seller creating a delivery address for their
 * own purchases.
 *
 * This test validates that sellers can create delivery addresses since they
 * have all customer permissions and may purchase from other sellers on the
 * platform. The test covers:
 *
 * 1. Seller registration with complete business information
 * 2. Seller authentication and JWT token issuance
 * 3. Address creation with full recipient and location details
 * 4. Validation of the created address data
 *
 * The address creation requires recipient name, phone number, complete street
 * address, city, state/province, postal code, and country information. The
 * system validates postal code and phone number formats, and automatically sets
 * the address as default if it's the seller's first address.
 */
export async function test_api_seller_address_creation_for_purchase(
  connection: api.IConnection,
) {
  // Step 1: Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateData = {
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
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateData,
  });
  typia.assert(seller);

  // Step 2: Verify seller authentication response
  TestValidator.equals("seller email matches", seller.email, sellerEmail);
  TestValidator.predicate("seller has valid ID", seller.id.length > 0);
  TestValidator.predicate(
    "seller has business name",
    seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "seller has access token",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller has refresh token",
    seller.token.refresh.length > 0,
  );

  // Step 3: Create a delivery address for the seller's purchases
  const addressCreateData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.pick([
      "USA",
      "Canada",
      "UK",
      "Australia",
    ] as const),
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.seller.addresses.create(
    connection,
    {
      body: addressCreateData,
    },
  );
  typia.assert(address);

  // Step 4: Validate the created address
  TestValidator.predicate("address has valid ID", address.id.length > 0);
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    addressCreateData.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    addressCreateData.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    address.address_line1,
    addressCreateData.address_line1,
  );
}
