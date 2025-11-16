import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test the unique address label constraint within a buyer's address book.
 *
 * This test validates that the system enforces uniqueness of address_label
 * values for addresses belonging to the same buyer, preventing confusion during
 * address selection at checkout.
 *
 * Test workflow:
 *
 * 1. Create a new buyer account
 * 2. Create the first address with label "Home"
 * 3. Attempt to create a second address with the same label "Home" (should fail)
 * 4. Create a third address with a different label "Office" (should succeed)
 */
export async function test_api_buyer_address_creation_unique_label_requirement(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account
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

  // Step 2: Create the first address with label "Home"
  const firstAddressData = {
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
      wordMax: 5,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.name(1),
    address_label: "Home",
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const firstAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: firstAddressData,
      },
    );
  typia.assert(firstAddress);

  // Verify first address was created successfully
  TestValidator.equals(
    "first address label matches",
    firstAddress.address_label,
    "Home",
  );

  // Step 3: Attempt to create a second address with the same label "Home"
  const duplicateLabelAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.name(1),
    address_label: "Home",
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
  } satisfies IShoppingMallBuyerAddress.ICreate;

  await TestValidator.error("duplicate address label should fail", async () => {
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: duplicateLabelAddressData,
      },
    );
  });

  // Step 4: Create a third address with a different label "Office"
  const uniqueLabelAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.name(1),
    address_label: "Office",
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const thirdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: uniqueLabelAddressData,
      },
    );
  typia.assert(thirdAddress);

  // Verify third address was created successfully with unique label
  TestValidator.equals(
    "third address label matches",
    thirdAddress.address_label,
    "Office",
  );
}
