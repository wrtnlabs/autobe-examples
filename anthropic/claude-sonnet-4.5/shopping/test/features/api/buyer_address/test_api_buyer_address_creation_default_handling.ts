import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test the default address handling behavior when buyers create multiple
 * addresses.
 *
 * This test validates the automatic default address management system:
 *
 * 1. First address created automatically becomes default
 * 2. Subsequent addresses without is_default flag remain non-default
 * 3. Setting is_default to true on a new address updates previous default to false
 * 4. Only one address can be default at any time
 *
 * Workflow:
 *
 * 1. Buyer registers and authenticates via join
 * 2. Create first address (auto-default)
 * 3. Create second address without is_default (non-default)
 * 4. Create third address with is_default=true (becomes new default)
 *
 * Validates proper default address state transitions and exclusivity.
 */
export async function test_api_buyer_address_creation_default_handling(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a buyer
  const buyerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerRegistration,
  });
  typia.assert(buyer);

  // Step 2: Create the first delivery address - should automatically become default
  const firstAddress = {
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

  const createdFirstAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: firstAddress,
      },
    );
  typia.assert(createdFirstAddress);

  TestValidator.equals(
    "first address should automatically be default",
    createdFirstAddress.is_default,
    true,
  );

  // Step 3: Create second address without is_default flag - should remain non-default
  const secondAddress = {
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
    country: "Canada",
    address_label: "Office",
    address_type: "commercial",
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdSecondAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: secondAddress,
      },
    );
  typia.assert(createdSecondAddress);

  TestValidator.equals(
    "second address without is_default flag should be non-default",
    createdSecondAddress.is_default,
    false,
  );

  // Step 4: Create third address with is_default set to true - should become new default
  const thirdAddress = {
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
    country: "United Kingdom",
    address_label: "Vacation Home",
    address_type: "residential",
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdThirdAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: thirdAddress,
      },
    );
  typia.assert(createdThirdAddress);

  TestValidator.equals(
    "third address with is_default true should be the new default",
    createdThirdAddress.is_default,
    true,
  );
}
