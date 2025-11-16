import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test deletion of an address that is currently set as the buyer's default
 * shipping address.
 *
 * This test validates the edge case behavior when deleting a default address
 * and ensures the address book remains in a valid state after deletion. The
 * test workflow includes:
 *
 * 1. Create buyer account and obtain authentication
 * 2. Create an address and set it as default
 * 3. Create additional non-default addresses
 * 4. Delete the default address
 * 5. Verify successful deletion and proper system state
 */
export async function test_api_buyer_address_deletion_default_address(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
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

  // Step 2: Create first address and set it as default
  const defaultAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          street_address_line2: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 5,
          }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          special_delivery_instructions: RandomGenerator.paragraph({
            sentences: 2,
          }),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "first address is default",
    defaultAddress.is_default,
    true,
  );

  // Step 3: Create additional non-default addresses
  const secondAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
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
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "Canada",
          address_label: "Office",
          address_type: "commercial",
          is_default: false,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address is not default",
    secondAddress.is_default,
    false,
  );

  const thirdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
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
              number &
                tags.Type<"uint32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          country: "United Kingdom",
          address_label: "Vacation Home",
          address_type: "residential",
          is_default: false,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(thirdAddress);

  // Step 4: Delete the default address
  const deletedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.erase(
      connection,
      {
        addressId: defaultAddress.id,
      },
    );
  typia.assert(deletedAddress);

  // Step 5: Verify successful deletion
  TestValidator.equals(
    "deleted address ID matches",
    deletedAddress.id,
    defaultAddress.id,
  );
  TestValidator.equals(
    "deleted address was default",
    deletedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "deleted address label matches",
    deletedAddress.address_label,
    defaultAddress.address_label,
  );
}
