import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test creating a delivery address with is_default flag set to true.
 *
 * This scenario validates that when a buyer creates their first address or
 * explicitly sets an address as default, the system correctly marks it as the
 * default shipping address. The test performs the following steps:
 *
 * 1. Register a new buyer account to obtain authentication
 * 2. Create the first address with is_default=true and verify it becomes the
 *    default address
 * 3. Create a second address also with is_default=true
 * 4. Verify that the second address is now the default and the first address is
 *    automatically set to is_default=false, maintaining the business rule that
 *    only one address can be default at a time
 */
export async function test_api_buyer_address_creation_as_default(
  connection: api.IConnection,
) {
  // Step 1: Register a new buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Create first address with is_default=true
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
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const firstAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: firstAddressData,
      },
    );
  typia.assert(firstAddress);

  // Verify first address is marked as default
  TestValidator.equals(
    "first address should be default",
    firstAddress.is_default,
    true,
  );
  TestValidator.equals(
    "first address label matches",
    firstAddress.address_label,
    "Home",
  );

  // Step 3: Create second address with is_default=true
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

  const secondAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: secondAddressData,
      },
    );
  typia.assert(secondAddress);

  // Step 4: Verify second address is now the default
  TestValidator.equals(
    "second address should be default",
    secondAddress.is_default,
    true,
  );
  TestValidator.equals(
    "second address label matches",
    secondAddress.address_label,
    "Office",
  );
}
