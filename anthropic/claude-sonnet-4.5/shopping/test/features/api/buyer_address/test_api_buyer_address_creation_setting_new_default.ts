import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test the business logic for setting a newly created address as the default
 * address.
 *
 * This test validates that when a buyer creates a new address with is_default
 * set to true, the system accepts the request and marks the new address as
 * default. The test creates two addresses sequentially - the first becomes
 * default automatically, then the second is explicitly set as default.
 *
 * Note: This test verifies that both addresses can be created with their
 * respective default flags, but cannot verify the automatic update of the first
 * address to non-default status due to the lack of an address retrieval API in
 * the current implementation.
 *
 * Test flow:
 *
 * 1. Create a buyer account for testing
 * 2. Create the first address (becomes default automatically)
 * 3. Verify the first address is marked as default
 * 4. Create a second address with is_default explicitly set to true
 * 5. Verify the second address is marked as default
 */
export async function test_api_buyer_address_creation_setting_new_default(
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

  // Step 2: Create the first address (should become default automatically)
  const firstAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
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
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const firstAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: firstAddressData,
      },
    );
  typia.assert(firstAddress);

  // Step 3: Verify the first address is marked as default
  TestValidator.equals(
    "first address should be default automatically",
    firstAddress.is_default,
    true,
  );

  // Step 4: Create the second address with is_default explicitly set to true
  const secondAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
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
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const secondAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: secondAddressData,
      },
    );
  typia.assert(secondAddress);

  // Step 5: Verify the second address is now the default
  TestValidator.equals(
    "second address should be the new default",
    secondAddress.is_default,
    true,
  );
}
