import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating an existing non-default address to become the default address,
 * validating that the previously default address automatically loses its
 * default status.
 *
 * This test ensures the exclusive default address business rule is enforced
 * during updates.
 *
 * Steps:
 *
 * 1. Create a buyer account with authentication
 * 2. Create the first address (automatically becomes default)
 * 3. Create the second address (non-default)
 * 4. Update the second address to set is_default to true
 * 5. Retrieve both addresses to verify default status
 * 6. Validate that only the second address is now default
 * 7. Validate that the first address is no longer default
 */
export async function test_api_buyer_address_update_changing_default_status(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account with authentication
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Create the first address (automatically becomes default)
  const firstAddressData = {
    recipient_name: typia.random<string & tags.MaxLength<100>>(),
    phone: RandomGenerator.mobile(),
    street_address_line1: typia.random<string & tags.MaxLength<200>>(),
    street_address_line2: typia.random<string & tags.MaxLength<200>>(),
    city: typia.random<string & tags.MaxLength<100>>(),
    state: typia.random<string & tags.MaxLength<100>>(),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: typia.random<string & tags.MaxLength<100>>(),
    address_label: RandomGenerator.pick([
      "Home",
      "Office",
      "Apartment",
    ] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const firstAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: firstAddressData,
      },
    );
  typia.assert(firstAddress);

  // Verify first address is default (first address created automatically becomes default)
  TestValidator.equals(
    "first address should be default initially",
    firstAddress.is_default,
    true,
  );

  // Step 3: Create the second address (non-default)
  const secondAddressData = {
    recipient_name: typia.random<string & tags.MaxLength<100>>(),
    phone: RandomGenerator.mobile(),
    street_address_line1: typia.random<string & tags.MaxLength<200>>(),
    city: typia.random<string & tags.MaxLength<100>>(),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: typia.random<string & tags.MaxLength<100>>(),
    address_label: RandomGenerator.pick([
      "Work",
      "Parents",
      "Vacation Home",
    ] as const),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const secondAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: secondAddressData,
      },
    );
  typia.assert(secondAddress);

  // Verify second address is not default initially
  TestValidator.equals(
    "second address should not be default initially",
    secondAddress.is_default,
    false,
  );

  // Step 4: Update the second address to set is_default to true
  const updateData = {
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedSecondAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: secondAddress.id,
        body: updateData,
      },
    );
  typia.assert(updatedSecondAddress);

  // Step 6: Validate that the second address is now default
  TestValidator.equals(
    "second address should now be default after update",
    updatedSecondAddress.is_default,
    true,
  );

  TestValidator.equals(
    "updated address ID should match second address",
    updatedSecondAddress.id,
    secondAddress.id,
  );

  // Step 5 & 7: Retrieve the first address and validate it is no longer default
  const retrievedFirstAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: firstAddress.id,
        body: {},
      },
    );
  typia.assert(retrievedFirstAddress);

  TestValidator.equals(
    "first address should no longer be default after second address update",
    retrievedFirstAddress.is_default,
    false,
  );

  TestValidator.equals(
    "retrieved first address ID should match original",
    retrievedFirstAddress.id,
    firstAddress.id,
  );
}
