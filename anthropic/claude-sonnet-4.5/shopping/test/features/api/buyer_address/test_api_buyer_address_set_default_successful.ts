import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test successful designation of a delivery address as the buyer's default
 * shipping address.
 *
 * This test validates the core functionality of setting a buyer's preferred
 * shipping address. The workflow includes:
 *
 * 1. Create buyer account and authenticate
 * 2. Create a delivery address
 * 3. Set the address as default using the setDefault endpoint
 * 4. Verify the is_default flag is true in the response
 */
export async function test_api_buyer_address_set_default_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account and authenticate
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

  // Step 2: Create a delivery address for the buyer
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
    country: "United States",
    address_label: RandomGenerator.pick(["Home", "Office", "Work"] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: Set the created address as default
  const defaultAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.setDefault(
      connection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(defaultAddress);

  // Step 4: Verify the address is now set as default
  TestValidator.equals(
    "address ID should match",
    defaultAddress.id,
    createdAddress.id,
  );
  TestValidator.predicate(
    "is_default should be true",
    defaultAddress.is_default === true,
  );
}
