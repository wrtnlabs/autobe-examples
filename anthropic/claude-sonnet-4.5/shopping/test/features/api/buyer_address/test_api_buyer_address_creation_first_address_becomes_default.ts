import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test that the first address created by a buyer automatically becomes their
 * default address.
 *
 * This test validates a critical business rule: when a buyer creates their very
 * first delivery address, the system must automatically designate it as the
 * default shipping address for convenience, regardless of whether the buyer
 * explicitly sets the is_default flag. This ensures buyers don't need to
 * manually configure a default address when they only have one address in their
 * address book.
 *
 * Test workflow:
 *
 * 1. Create a new buyer account (starting with empty address book)
 * 2. Create the buyer's first address without setting is_default to true
 * 3. Verify the returned address has is_default set to true automatically
 */
export async function test_api_buyer_address_creation_first_address_becomes_default(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account with empty address book
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

  // Step 2: Create the buyer's first address without explicitly setting is_default
  const addressData = {
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
    address_label: RandomGenerator.pick([
      "Home",
      "Office",
      "Parents",
      "Work",
    ] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const firstAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(firstAddress);

  // Step 3: Verify the first address automatically became the default address
  TestValidator.equals(
    "first address should automatically be set as default",
    firstAddress.is_default,
    true,
  );
}
