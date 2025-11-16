import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test the complete workflow of creating a new delivery address for an
 * authenticated buyer with all required and optional fields populated.
 *
 * This test validates that buyers can successfully add a new shipping address
 * to their address book with complete postal information including recipient
 * details, contact phone, full street address with both primary and secondary
 * lines, city, state, postal code, country, custom address label, address type
 * designation, special delivery instructions, and default address flag.
 *
 * The test verifies:
 *
 * 1. Buyer authentication and session establishment
 * 2. Complete address creation with all required and optional fields
 * 3. Response contains system-generated fields (id, created_at, updated_at)
 * 4. Buyer ID association is correct
 * 5. All submitted data is accurately stored
 * 6. Default address flag is properly handled
 */
export async function test_api_buyer_address_creation_with_complete_information(
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
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Prepare complete address data with all required and optional fields
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street`,
    street_address_line2: `Apt ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`,
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
    address_label: RandomGenerator.pick([
      "Home",
      "Office",
      "Vacation Home",
    ] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  // Step 3: Create the address through the API
  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 4: Verify buyer ID association matches the authenticated user
  TestValidator.equals(
    "address buyer ID should match authenticated buyer",
    createdAddress.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 5: Validate all input data is accurately stored
  TestValidator.equals(
    "recipient name matches input",
    createdAddress.recipient_name,
    addressData.recipient_name,
  );

  TestValidator.equals(
    "phone number matches input",
    createdAddress.phone,
    addressData.phone,
  );

  TestValidator.equals(
    "street address line 1 matches input",
    createdAddress.street_address_line1,
    addressData.street_address_line1,
  );

  TestValidator.equals(
    "street address line 2 matches input",
    createdAddress.street_address_line2,
    addressData.street_address_line2,
  );

  TestValidator.equals(
    "city matches input",
    createdAddress.city,
    addressData.city,
  );

  TestValidator.equals(
    "state matches input",
    createdAddress.state,
    addressData.state,
  );

  TestValidator.equals(
    "postal code matches input",
    createdAddress.postal_code,
    addressData.postal_code,
  );

  TestValidator.equals(
    "country matches input",
    createdAddress.country,
    addressData.country,
  );

  TestValidator.equals(
    "address label matches input",
    createdAddress.address_label,
    addressData.address_label,
  );

  TestValidator.equals(
    "address type matches input",
    createdAddress.address_type,
    addressData.address_type,
  );

  TestValidator.equals(
    "special delivery instructions match input",
    createdAddress.special_delivery_instructions,
    addressData.special_delivery_instructions,
  );

  TestValidator.equals(
    "is_default flag matches input",
    createdAddress.is_default,
    addressData.is_default,
  );
}
