import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test retrieving addresses with different default status values.
 *
 * This test validates the is_default field behavior when creating and
 * retrieving buyer addresses. It verifies that:
 *
 * 1. The first address created automatically becomes the default address
 * 2. Subsequently created addresses have is_default = false by default
 * 3. The is_default field is correctly reflected when retrieving addresses by ID
 *
 * Test workflow:
 *
 * 1. Create a buyer account
 * 2. Create the first address (should auto-default to is_default = true)
 * 3. Retrieve the first address and verify is_default = true
 * 4. Create a second address without setting is_default
 * 5. Retrieve the second address and verify is_default = false
 * 6. Verify the first address is still the default
 */
export async function test_api_buyer_address_retrieval_default_status(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Create the first address (should automatically become default)
  const firstAddressData = {
    recipient_name: typia.random<string & tags.MaxLength<100>>(),
    phone: RandomGenerator.mobile(),
    street_address_line1: typia.random<string & tags.MaxLength<200>>(),
    street_address_line2: typia.random<string & tags.MaxLength<200>>(),
    city: typia.random<string & tags.MaxLength<100>>(),
    state: typia.random<string & tags.MaxLength<100>>(),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: typia.random<string & tags.MaxLength<100>>(),
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const firstAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: firstAddressData,
      },
    );
  typia.assert(firstAddress);

  // Step 3: Retrieve the first address and verify is_default = true
  const retrievedFirstAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.at(connection, {
      addressId: firstAddress.id,
    });
  typia.assert(retrievedFirstAddress);
  TestValidator.equals(
    "first address should be default",
    retrievedFirstAddress.is_default,
    true,
  );

  // Step 4: Create a second address without setting is_default
  const secondAddressData = {
    recipient_name: typia.random<string & tags.MaxLength<100>>(),
    phone: RandomGenerator.mobile(),
    street_address_line1: typia.random<string & tags.MaxLength<200>>(),
    street_address_line2: typia.random<string & tags.MaxLength<200>>(),
    city: typia.random<string & tags.MaxLength<100>>(),
    state: typia.random<string & tags.MaxLength<100>>(),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: typia.random<string & tags.MaxLength<100>>(),
    address_label: "Office",
    address_type: "commercial",
    special_delivery_instructions: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const secondAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: secondAddressData,
      },
    );
  typia.assert(secondAddress);

  // Step 5: Retrieve the second address and verify is_default = false
  const retrievedSecondAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.at(connection, {
      addressId: secondAddress.id,
    });
  typia.assert(retrievedSecondAddress);
  TestValidator.equals(
    "second address should not be default",
    retrievedSecondAddress.is_default,
    false,
  );

  // Step 6: Verify the first address is still the default
  const reRetrievedFirstAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.at(connection, {
      addressId: firstAddress.id,
    });
  typia.assert(reRetrievedFirstAddress);
  TestValidator.equals(
    "first address should remain default",
    reRetrievedFirstAddress.is_default,
    true,
  );
}
