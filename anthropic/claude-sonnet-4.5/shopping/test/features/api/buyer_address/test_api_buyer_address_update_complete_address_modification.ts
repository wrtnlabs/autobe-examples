import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test complete address modification workflow for authenticated buyers.
 *
 * This test validates that buyers can successfully update all fields of an
 * existing delivery address including recipient information, contact details,
 * postal address components, custom labels, address type, delivery
 * instructions, and default status.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Create an initial address with baseline values
 * 3. Update all modifiable address fields with new values
 * 4. Validate all updated values are correctly stored
 * 5. Verify immutable fields (id, created_at) remain unchanged
 * 6. Confirm updated_at timestamp is refreshed
 * 7. Ensure address ownership is maintained
 */
export async function test_api_buyer_address_update_complete_address_modification(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 2: Create initial address with baseline values
  const initialAddressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    street_address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.name(1),
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: false,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const initialAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      { body: initialAddressData },
    );
  typia.assert(initialAddress);

  // Step 3: Prepare comprehensive update with all fields modified
  const updateData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 9,
    }),
    street_address_line2: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.name(1),
    address_label: "Office",
    address_type: "commercial",
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 5 }),
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  // Step 4: Execute the update operation
  const updatedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: initialAddress.id,
        body: updateData,
      },
    );
  typia.assert(updatedAddress);

  // Step 5: Validate all updated field values match the new values
  TestValidator.equals(
    "updated recipient_name matches",
    updatedAddress.recipient_name,
    updateData.recipient_name,
  );
  TestValidator.equals(
    "updated phone matches",
    updatedAddress.phone,
    updateData.phone,
  );
  TestValidator.equals(
    "updated street_address_line1 matches",
    updatedAddress.street_address_line1,
    updateData.street_address_line1,
  );
  TestValidator.equals(
    "updated street_address_line2 matches",
    updatedAddress.street_address_line2,
    updateData.street_address_line2,
  );
  TestValidator.equals(
    "updated city matches",
    updatedAddress.city,
    updateData.city,
  );
  TestValidator.equals(
    "updated state matches",
    updatedAddress.state,
    updateData.state,
  );
  TestValidator.equals(
    "updated postal_code matches",
    updatedAddress.postal_code,
    updateData.postal_code,
  );
  TestValidator.equals(
    "updated country matches",
    updatedAddress.country,
    updateData.country,
  );
  TestValidator.equals(
    "updated address_label matches",
    updatedAddress.address_label,
    updateData.address_label,
  );
  TestValidator.equals(
    "updated address_type matches",
    updatedAddress.address_type,
    updateData.address_type,
  );
  TestValidator.equals(
    "updated special_delivery_instructions matches",
    updatedAddress.special_delivery_instructions,
    updateData.special_delivery_instructions,
  );
  TestValidator.equals(
    "updated is_default matches",
    updatedAddress.is_default,
    updateData.is_default,
  );

  // Step 6: Verify immutable fields remain unchanged
  TestValidator.equals(
    "id remains unchanged",
    updatedAddress.id,
    initialAddress.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedAddress.created_at,
    initialAddress.created_at,
  );
  TestValidator.equals(
    "buyer association remains unchanged",
    updatedAddress.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 7: Confirm updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is refreshed after modification",
    new Date(updatedAddress.updated_at).getTime() >=
      new Date(initialAddress.updated_at).getTime(),
  );
}
