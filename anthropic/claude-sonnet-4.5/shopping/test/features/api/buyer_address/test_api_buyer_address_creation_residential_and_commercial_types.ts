import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating delivery addresses with different address_type values
 * ('residential' and 'commercial').
 *
 * This test validates that the system correctly stores and differentiates
 * between residential and commercial delivery locations. It ensures that buyers
 * can properly categorize their addresses for carrier delivery optimization and
 * appropriate service level application.
 *
 * Test workflow:
 *
 * 1. Create a new buyer account for testing
 * 2. Authenticate the buyer and obtain authorization tokens
 * 3. Create a residential address with address_type: "residential"
 * 4. Verify the residential address is stored correctly
 * 5. Create a commercial address with address_type: "commercial"
 * 6. Verify the commercial address is stored correctly
 * 7. Confirm both addresses maintain their distinct address_type classifications
 */
export async function test_api_buyer_address_creation_residential_and_commercial_types(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account for testing multiple address types
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Verify buyer authentication
  TestValidator.equals("buyer email matches", buyer.email, buyerData.email);
  TestValidator.equals(
    "buyer full_name matches",
    buyer.full_name,
    buyerData.full_name,
  );

  // Step 2: Create a residential address
  const residentialAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    street_address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
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
    special_delivery_instructions: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const residentialAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: residentialAddressData,
      },
    );
  typia.assert(residentialAddress);

  // Validate residential address creation
  TestValidator.equals(
    "residential address_type is correct",
    residentialAddress.address_type,
    "residential",
  );
  TestValidator.equals(
    "residential recipient_name matches",
    residentialAddress.recipient_name,
    residentialAddressData.recipient_name,
  );
  TestValidator.equals(
    "residential address_label matches",
    residentialAddress.address_label,
    residentialAddressData.address_label,
  );
  TestValidator.equals(
    "residential city matches",
    residentialAddress.city,
    residentialAddressData.city,
  );
  TestValidator.equals(
    "residential country matches",
    residentialAddress.country,
    residentialAddressData.country,
  );

  // Step 3: Create a commercial address
  const commercialAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    street_address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
    address_label: "Office",
    address_type: "commercial",
    special_delivery_instructions: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const commercialAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: commercialAddressData,
      },
    );
  typia.assert(commercialAddress);

  // Validate commercial address creation
  TestValidator.equals(
    "commercial address_type is correct",
    commercialAddress.address_type,
    "commercial",
  );
  TestValidator.equals(
    "commercial recipient_name matches",
    commercialAddress.recipient_name,
    commercialAddressData.recipient_name,
  );
  TestValidator.equals(
    "commercial address_label matches",
    commercialAddress.address_label,
    commercialAddressData.address_label,
  );
  TestValidator.equals(
    "commercial city matches",
    commercialAddress.city,
    commercialAddressData.city,
  );
  TestValidator.equals(
    "commercial country matches",
    commercialAddress.country,
    commercialAddressData.country,
  );

  // Step 4: Verify that both addresses maintain their distinct address_type classifications
  TestValidator.notEquals(
    "address types are different",
    residentialAddress.address_type,
    commercialAddress.address_type,
  );
  TestValidator.predicate(
    "residential address has correct type",
    residentialAddress.address_type === "residential",
  );
  TestValidator.predicate(
    "commercial address has correct type",
    commercialAddress.address_type === "commercial",
  );
}
