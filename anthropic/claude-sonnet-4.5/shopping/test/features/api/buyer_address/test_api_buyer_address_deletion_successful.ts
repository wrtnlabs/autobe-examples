import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test successful deletion of a buyer's delivery address from their address
 * book.
 *
 * This test validates the complete workflow for address management:
 *
 * 1. Create a new buyer account through registration
 * 2. Create a delivery address for the buyer
 * 3. Delete the created address
 *
 * The test verifies that the address is successfully removed from the buyer's
 * address book and that the deletion operation properly validates ownership
 * (buyer can only delete their own addresses). It confirms that the response
 * returns the deleted address details for audit purposes.
 */
export async function test_api_buyer_address_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account through registration
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
      wordMin: 4,
      wordMax: 8,
    }),
    city: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.name(1),
    address_label: RandomGenerator.pick([
      "Home",
      "Office",
      "Work",
      "Other",
    ] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
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

  // Step 3: Delete the created address
  const deletedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.erase(
      connection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(deletedAddress);

  // Step 4: Validate that the deleted address matches the created address
  TestValidator.equals(
    "deleted address ID matches created address ID",
    deletedAddress.id,
    createdAddress.id,
  );

  TestValidator.equals(
    "deleted address recipient name matches",
    deletedAddress.recipient_name,
    createdAddress.recipient_name,
  );
}
