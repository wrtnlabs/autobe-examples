import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test retrieving a specific delivery address by its ID for an authenticated
 * buyer.
 *
 * This test validates the complete workflow of address retrieval:
 *
 * 1. Create a new buyer account and authenticate
 * 2. Create a delivery address with complete information including all optional
 *    fields
 * 3. Retrieve the address using its ID
 * 4. Verify all fields match exactly between created and retrieved addresses
 * 5. Validate system-generated fields have proper values and formats
 */
export async function test_api_buyer_address_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create a delivery address with complete information including all optional fields
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    street_address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 5,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.pick([
      "United States",
      "Canada",
      "United Kingdom",
      "Australia",
      "Germany",
    ] as const),
    address_label: RandomGenerator.pick([
      "Home",
      "Office",
      "Parents House",
      "Vacation Home",
    ] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
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

  // Step 3: Retrieve the address using its ID
  const retrievedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.at(connection, {
      addressId: createdAddress.id,
    });
  typia.assert(retrievedAddress);

  // Step 4: Verify that all fields match exactly between created and retrieved addresses
  TestValidator.equals(
    "recipient_name matches",
    retrievedAddress.recipient_name,
    createdAddress.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    retrievedAddress.phone,
    createdAddress.phone,
  );
  TestValidator.equals(
    "street_address_line1 matches",
    retrievedAddress.street_address_line1,
    createdAddress.street_address_line1,
  );
  TestValidator.equals(
    "street_address_line2 matches",
    retrievedAddress.street_address_line2,
    createdAddress.street_address_line2,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "state matches",
    retrievedAddress.state,
    createdAddress.state,
  );
  TestValidator.equals(
    "postal_code matches",
    retrievedAddress.postal_code,
    createdAddress.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    createdAddress.country,
  );
  TestValidator.equals(
    "address_label matches",
    retrievedAddress.address_label,
    createdAddress.address_label,
  );
  TestValidator.equals(
    "address_type matches",
    retrievedAddress.address_type,
    createdAddress.address_type,
  );
  TestValidator.equals(
    "special_delivery_instructions matches",
    retrievedAddress.special_delivery_instructions,
    createdAddress.special_delivery_instructions,
  );
  TestValidator.equals(
    "is_default matches",
    retrievedAddress.is_default,
    createdAddress.is_default,
  );

  // Step 5: Validate system-generated fields have proper values and formats
  TestValidator.equals("id matches", retrievedAddress.id, createdAddress.id);
  TestValidator.equals(
    "shopping_mall_buyer_id matches",
    retrievedAddress.shopping_mall_buyer_id,
    createdAddress.shopping_mall_buyer_id,
  );
  TestValidator.equals(
    "shopping_mall_buyer_id is buyer id",
    retrievedAddress.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAddress.created_at,
    createdAddress.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedAddress.updated_at,
    createdAddress.updated_at,
  );

  // Verify the retrieved address is exactly the same as created address
  TestValidator.equals(
    "complete address matches",
    retrievedAddress,
    createdAddress,
  );
}
