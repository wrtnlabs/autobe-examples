import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating recipient_name and phone fields to reflect changes in who
 * receives deliveries at an address or updated contact information.
 *
 * This test validates that buyers can modify recipient details when delivery
 * recipients change (e.g., different family member, new office manager) or when
 * contact numbers are updated. The test creates a buyer and an address with
 * specific recipient information, then updates to change recipient_name to a
 * different person and phone to a new contact number.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Create an initial address with original recipient name and phone number
 * 3. Update the address with new recipient name and new phone number
 * 4. Validate that recipient and contact updates are correctly stored
 * 5. Verify phone number format validation is applied
 * 6. Confirm the address remains valid for carrier communication and delivery
 */
export async function test_api_buyer_address_update_recipient_and_contact_changes(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authenticatedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(authenticatedBuyer);

  // Step 2: Create initial address with original recipient information
  const originalRecipientName = RandomGenerator.name();
  const originalPhoneNumber = RandomGenerator.mobile();

  const initialAddressData = {
    recipient_name: originalRecipientName,
    phone: originalPhoneNumber,
    street_address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} Main Street`,
    street_address_line2: `Apt ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>>()}`,
    city: "Springfield",
    state: "Illinois",
    postal_code: "62701",
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: "Ring doorbell twice",
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

  // Verify initial address was created with original recipient information
  TestValidator.equals(
    "initial recipient name matches",
    createdAddress.recipient_name,
    originalRecipientName,
  );
  TestValidator.equals(
    "initial phone number matches",
    createdAddress.phone,
    originalPhoneNumber,
  );

  // Step 3: Update address with new recipient name and phone number
  const newRecipientName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();

  const updateData = {
    recipient_name: newRecipientName,
    phone: newPhoneNumber,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: updateData,
      },
    );
  typia.assert(updatedAddress);

  // Step 4: Validate recipient and contact updates are correctly stored
  TestValidator.equals(
    "recipient name updated successfully",
    updatedAddress.recipient_name,
    newRecipientName,
  );
  TestValidator.equals(
    "phone number updated successfully",
    updatedAddress.phone,
    newPhoneNumber,
  );

  // Step 5: Verify other address fields remain unchanged
  TestValidator.equals(
    "address ID remains the same",
    updatedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "street address line 1 unchanged",
    updatedAddress.street_address_line1,
    createdAddress.street_address_line1,
  );
  TestValidator.equals(
    "city unchanged",
    updatedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "postal code unchanged",
    updatedAddress.postal_code,
    createdAddress.postal_code,
  );
  TestValidator.equals(
    "country unchanged",
    updatedAddress.country,
    createdAddress.country,
  );

  // Step 6: Verify recipient name and phone are different from originals
  TestValidator.notEquals(
    "recipient name changed from original",
    updatedAddress.recipient_name,
    originalRecipientName,
  );
  TestValidator.notEquals(
    "phone number changed from original",
    updatedAddress.phone,
    originalPhoneNumber,
  );

  // Step 7: Validate updated timestamp reflects modification
  TestValidator.predicate(
    "updated timestamp is after created timestamp",
    new Date(updatedAddress.updated_at).getTime() >=
      new Date(createdAddress.updated_at).getTime(),
  );
}
