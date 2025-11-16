import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test partial updates where only specific address fields are modified while
 * others remain unchanged.
 *
 * This test validates the partial update capability that allows buyers to
 * update individual address components such as correcting a phone number or
 * fixing a postal code without resubmitting the entire address.
 *
 * Test workflow:
 *
 * 1. Create authenticated buyer account
 * 2. Create initial complete address with all fields populated
 * 3. Perform first partial update: modify only phone number
 * 4. Verify phone changed, all other fields unchanged, updated_at changed
 * 5. Perform second partial update: modify only postal_code
 * 6. Verify postal_code changed, all other fields unchanged, updated_at changed
 * 7. Perform third partial update: modify only special_delivery_instructions
 * 8. Verify instructions changed, all other fields unchanged, updated_at changed
 */
export async function test_api_buyer_address_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated buyer account
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create initial complete address
  const initialAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          street_address_line2: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
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
            sentences: 5,
          }),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(initialAddress);

  // Store original values for comparison
  const originalPhone = initialAddress.phone;
  const originalPostalCode = initialAddress.postal_code;
  const originalInstructions = initialAddress.special_delivery_instructions;
  const originalRecipientName = initialAddress.recipient_name;
  const originalStreetLine1 = initialAddress.street_address_line1;
  const originalCity = initialAddress.city;

  // Step 3: First partial update - modify only phone number
  const newPhone = RandomGenerator.mobile();
  const afterPhoneUpdate: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: initialAddress.id,
        body: {
          phone: newPhone,
        } satisfies IShoppingMallBuyerAddress.IUpdate,
      },
    );
  typia.assert(afterPhoneUpdate);

  // Verify phone changed
  TestValidator.equals(
    "phone number updated",
    afterPhoneUpdate.phone,
    newPhone,
  );

  // Verify other fields unchanged
  TestValidator.equals(
    "recipient name unchanged after phone update",
    afterPhoneUpdate.recipient_name,
    originalRecipientName,
  );
  TestValidator.equals(
    "street address unchanged after phone update",
    afterPhoneUpdate.street_address_line1,
    originalStreetLine1,
  );
  TestValidator.equals(
    "city unchanged after phone update",
    afterPhoneUpdate.city,
    originalCity,
  );
  TestValidator.equals(
    "postal code unchanged after phone update",
    afterPhoneUpdate.postal_code,
    originalPostalCode,
  );
  TestValidator.equals(
    "delivery instructions unchanged after phone update",
    afterPhoneUpdate.special_delivery_instructions,
    originalInstructions,
  );

  // Verify updated_at changed
  TestValidator.predicate(
    "updated_at changed after phone update",
    afterPhoneUpdate.updated_at !== initialAddress.updated_at,
  );

  // Step 4: Second partial update - modify only postal_code
  const newPostalCode = typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
    >()
    .toString();
  const afterPostalUpdate: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: initialAddress.id,
        body: {
          postal_code: newPostalCode,
        } satisfies IShoppingMallBuyerAddress.IUpdate,
      },
    );
  typia.assert(afterPostalUpdate);

  // Verify postal_code changed
  TestValidator.equals(
    "postal code updated",
    afterPostalUpdate.postal_code,
    newPostalCode,
  );

  // Verify phone retained from previous update
  TestValidator.equals(
    "phone number retained after postal update",
    afterPostalUpdate.phone,
    newPhone,
  );

  // Verify other original fields unchanged
  TestValidator.equals(
    "recipient name unchanged after postal update",
    afterPostalUpdate.recipient_name,
    originalRecipientName,
  );
  TestValidator.equals(
    "street address unchanged after postal update",
    afterPostalUpdate.street_address_line1,
    originalStreetLine1,
  );
  TestValidator.equals(
    "city unchanged after postal update",
    afterPostalUpdate.city,
    originalCity,
  );
  TestValidator.equals(
    "delivery instructions unchanged after postal update",
    afterPostalUpdate.special_delivery_instructions,
    originalInstructions,
  );

  // Verify updated_at changed again
  TestValidator.predicate(
    "updated_at changed after postal update",
    afterPostalUpdate.updated_at !== afterPhoneUpdate.updated_at,
  );

  // Step 5: Third partial update - modify only special_delivery_instructions
  const newInstructions = RandomGenerator.paragraph({ sentences: 8 });
  const afterInstructionsUpdate: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: initialAddress.id,
        body: {
          special_delivery_instructions: newInstructions,
        } satisfies IShoppingMallBuyerAddress.IUpdate,
      },
    );
  typia.assert(afterInstructionsUpdate);

  // Verify instructions changed
  TestValidator.equals(
    "delivery instructions updated",
    afterInstructionsUpdate.special_delivery_instructions,
    newInstructions,
  );

  // Verify previously updated fields retained
  TestValidator.equals(
    "phone number retained after instructions update",
    afterInstructionsUpdate.phone,
    newPhone,
  );
  TestValidator.equals(
    "postal code retained after instructions update",
    afterInstructionsUpdate.postal_code,
    newPostalCode,
  );

  // Verify other original fields unchanged
  TestValidator.equals(
    "recipient name unchanged after instructions update",
    afterInstructionsUpdate.recipient_name,
    originalRecipientName,
  );
  TestValidator.equals(
    "street address unchanged after instructions update",
    afterInstructionsUpdate.street_address_line1,
    originalStreetLine1,
  );
  TestValidator.equals(
    "city unchanged after instructions update",
    afterInstructionsUpdate.city,
    originalCity,
  );

  // Verify updated_at changed again
  TestValidator.predicate(
    "updated_at changed after instructions update",
    afterInstructionsUpdate.updated_at !== afterPostalUpdate.updated_at,
  );
}
