import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test idempotent behavior when setting an address as default that is already
 * the default address.
 *
 * This test validates that the setDefault endpoint handles repeated calls
 * gracefully without causing state inconsistencies. The scenario creates a
 * buyer account, creates an address, sets it as default, and then calls
 * setDefault again on the same address to verify idempotent behavior.
 *
 * Test Flow:
 *
 * 1. Create buyer account and obtain authentication tokens
 * 2. Create a delivery address
 * 3. Call setDefault on the address (first call)
 * 4. Call setDefault on the same address again (idempotency test)
 * 5. Verify both operations succeed and the address remains as default
 */
export async function test_api_buyer_address_set_default_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and authenticate
  const buyerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRegistration,
    });
  typia.assert(buyer);

  // Step 2: Create a delivery address
  const addressData = {
    recipient_name: typia.random<string & tags.MaxLength<100>>(),
    phone: RandomGenerator.mobile(),
    street_address_line1: typia.random<string & tags.MaxLength<200>>(),
    street_address_line2: typia.random<string & tags.MaxLength<200>>(),
    city: typia.random<string & tags.MaxLength<100>>(),
    state: typia.random<string & tags.MaxLength<100>>(),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: typia.random<string & tags.MaxLength<100>>(),
    address_label: typia.random<string & tags.MaxLength<50>>(),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    special_delivery_instructions: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(createdAddress);

  // Step 3: First setDefault call - set the address as default
  const firstSetDefaultResponse: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.setDefault(
      connection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(firstSetDefaultResponse);

  // Verify the address is now set as default
  TestValidator.equals(
    "address is set as default after first call",
    firstSetDefaultResponse.is_default,
    true,
  );
  TestValidator.equals(
    "address ID matches",
    firstSetDefaultResponse.id,
    createdAddress.id,
  );

  // Step 4: Second setDefault call - test idempotency
  const secondSetDefaultResponse: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.setDefault(
      connection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(secondSetDefaultResponse);

  // Step 5: Verify idempotent behavior - address remains as default
  TestValidator.equals(
    "address remains default after second call (idempotency)",
    secondSetDefaultResponse.is_default,
    true,
  );
  TestValidator.equals(
    "address ID still matches after second call",
    secondSetDefaultResponse.id,
    createdAddress.id,
  );

  // Verify both responses are consistent
  TestValidator.equals(
    "first and second setDefault responses are consistent",
    firstSetDefaultResponse.is_default,
    secondSetDefaultResponse.is_default,
  );
}
