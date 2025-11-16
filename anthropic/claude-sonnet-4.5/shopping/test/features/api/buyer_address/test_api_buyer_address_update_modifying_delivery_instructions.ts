import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating special_delivery_instructions to add, modify, or remove carrier
 * instructions as buyer circumstances change.
 *
 * This scenario validates that buyers can maintain current delivery preferences
 * such as adding gate codes after moving to a gated community, updating
 * availability notes when work schedules change, or modifying preferred
 * delivery locations. The test creates a buyer and an address without special
 * instructions, updates to add detailed delivery instructions, then updates
 * again to modify those instructions with different content, and finally
 * updates to clear the instructions by setting to null. Validation confirms
 * that instruction updates are accurately stored within the 500-character limit
 * and are immediately available for carrier reference.
 *
 * Test workflow:
 *
 * 1. Create a buyer account through registration
 * 2. Create an address without special_delivery_instructions
 * 3. Update the address to add detailed delivery instructions
 * 4. Verify the instructions were stored correctly
 * 5. Update the address again to modify the instructions with different content
 * 6. Verify the modified instructions were stored
 * 7. Update the address to clear instructions by setting to null
 * 8. Verify the instructions were cleared
 */
export async function test_api_buyer_address_update_modifying_delivery_instructions(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account through registration
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

  // Step 2: Create an address without special_delivery_instructions
  const initialAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: RandomGenerator.name(1),
    address_label: RandomGenerator.name(1),
    address_type: RandomGenerator.pick(["residential", "commercial"] as const),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const createdAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: initialAddressData,
      },
    );
  typia.assert(createdAddress);
  TestValidator.equals(
    "initial address has no special instructions",
    createdAddress.special_delivery_instructions,
    null,
  );

  // Step 3: Update the address to add detailed delivery instructions
  const firstInstructions =
    "Gate code: 1234. Please leave packages at the back door near the garage. Ring doorbell if home.";
  const updateWithInstructions = {
    special_delivery_instructions: firstInstructions,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedAddressWithInstructions: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: updateWithInstructions,
      },
    );
  typia.assert(updatedAddressWithInstructions);

  // Step 4: Verify the instructions were stored correctly
  TestValidator.equals(
    "first instructions stored correctly",
    updatedAddressWithInstructions.special_delivery_instructions,
    firstInstructions,
  );
  TestValidator.predicate(
    "instructions within character limit",
    firstInstructions.length <= 500,
  );

  // Step 5: Update the address again to modify the instructions with different content
  const modifiedInstructions =
    "New gate code: 5678. Available after 5 PM on weekdays. Weekend delivery preferred. Leave at front porch.";
  const updateWithModifiedInstructions = {
    special_delivery_instructions: modifiedInstructions,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedAddressModified: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: updateWithModifiedInstructions,
      },
    );
  typia.assert(updatedAddressModified);

  // Step 6: Verify the modified instructions were stored
  TestValidator.equals(
    "modified instructions stored correctly",
    updatedAddressModified.special_delivery_instructions,
    modifiedInstructions,
  );
  TestValidator.notEquals(
    "instructions changed from original",
    updatedAddressModified.special_delivery_instructions,
    firstInstructions,
  );
  TestValidator.predicate(
    "modified instructions within character limit",
    modifiedInstructions.length <= 500,
  );

  // Step 7: Update the address to clear instructions by setting to null
  const clearInstructions = {
    special_delivery_instructions: null,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedAddressCleared: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: clearInstructions,
      },
    );
  typia.assert(updatedAddressCleared);

  // Step 8: Verify the instructions were cleared
  TestValidator.equals(
    "instructions cleared successfully",
    updatedAddressCleared.special_delivery_instructions,
    null,
  );
}
