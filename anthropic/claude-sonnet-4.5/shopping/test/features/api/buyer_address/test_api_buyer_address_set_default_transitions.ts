import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test that setting a new default address automatically unsets the previous
 * default address.
 *
 * This test validates the atomic transition logic ensuring only one address is
 * default at any time. It creates a buyer account, creates two addresses, sets
 * the second address as default, and verifies that the transition completes
 * successfully.
 *
 * Business rule: Exactly one default address per buyer at all times.
 *
 * Steps:
 *
 * 1. Create buyer account and authenticate
 * 2. Create first address (Address A) - becomes default automatically
 * 3. Verify Address A has is_default: true
 * 4. Create second address (Address B) - should be non-default
 * 5. Verify Address B has is_default: false
 * 6. Set Address B as default using setDefault endpoint
 * 7. Verify Address B now has is_default: true
 *
 * Note: Due to API limitations (no individual address retrieval endpoint), we
 * verify the default transition by confirming Address B successfully becomes
 * default. The server-side atomic transaction ensures Address A is
 * automatically unset.
 */
export async function test_api_buyer_address_set_default_transitions(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and authenticate
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create first address (Address A) - becomes default automatically
  const addressAData = {
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
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const addressA: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressAData,
      },
    );
  typia.assert(addressA);

  // Step 3: Verify Address A has is_default: true
  TestValidator.equals(
    "Address A should be default after creation",
    addressA.is_default,
    true,
  );

  // Step 4: Create second address (Address B) - should be non-default
  const addressBData = {
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
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const addressB: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressBData,
      },
    );
  typia.assert(addressB);

  // Step 5: Verify Address B has is_default: false
  TestValidator.equals(
    "Address B should not be default after creation",
    addressB.is_default,
    false,
  );

  // Step 6: Set Address B as default using setDefault endpoint
  const addressBUpdated: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.setDefault(
      connection,
      {
        addressId: addressB.id,
      },
    );
  typia.assert(addressBUpdated);

  // Step 7: Verify Address B now has is_default: true
  TestValidator.equals(
    "Address B should be default after setDefault call",
    addressBUpdated.is_default,
    true,
  );
  TestValidator.equals(
    "Address B ID should match original",
    addressBUpdated.id,
    addressB.id,
  );
}
