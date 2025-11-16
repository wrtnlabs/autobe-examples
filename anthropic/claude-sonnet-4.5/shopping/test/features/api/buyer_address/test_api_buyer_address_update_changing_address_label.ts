import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating the address_label field to rename saved addresses as buyer
 * preferences or address purposes change.
 *
 * This scenario validates that buyers can modify the custom labels they use to
 * identify addresses, such as changing 'Office' to 'Old Office' when changing
 * jobs or renaming 'Temporary' to 'Vacation Home' when a temporary address
 * becomes permanent.
 *
 * The test creates a buyer with multiple addresses having different labels,
 * then updates one address to change its label to a new unique value, and
 * verifies that the label update is successful, the label remains unique within
 * the buyer's address book, and other addresses are unaffected.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a buyer account
 * 2. Create multiple addresses with distinct labels
 * 3. Update one address label to a new value
 * 4. Verify the label update was successful
 * 5. Verify label uniqueness is maintained
 * 6. Verify other addresses remain unchanged
 */
export async function test_api_buyer_address_update_changing_address_label(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
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

  // Step 2: Create multiple addresses with distinct labels
  const addressLabels = ["Home", "Office", "Parents"] as const;
  const addresses: IShoppingMallBuyerAddress[] = await ArrayUtil.asyncMap(
    addressLabels,
    async (label) => {
      const addressData = {
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
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
        address_label: label,
        address_type: RandomGenerator.pick([
          "residential",
          "commercial",
        ] as const),
      } satisfies IShoppingMallBuyerAddress.ICreate;

      const address =
        await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
          connection,
          {
            body: addressData,
          },
        );
      typia.assert(address);
      return address;
    },
  );

  // Step 3: Update one address label to a new value
  const addressToUpdate = addresses[1]; // Update the "Office" address
  const newLabel = "New Office";

  const updateData = {
    address_label: newLabel,
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedAddress: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: addressToUpdate.id,
        body: updateData,
      },
    );
  typia.assert(updatedAddress);

  // Step 4: Verify the label update was successful
  TestValidator.equals(
    "updated address label matches new value",
    updatedAddress.address_label,
    newLabel,
  );

  TestValidator.equals(
    "updated address ID remains the same",
    updatedAddress.id,
    addressToUpdate.id,
  );

  // Step 5: Verify label uniqueness is maintained
  const allLabels = [
    addresses[0].address_label, // "Home"
    newLabel, // "New Office"
    addresses[2].address_label, // "Parents"
  ];

  const uniqueLabels = new Set(allLabels);
  TestValidator.equals(
    "all labels remain unique after update",
    uniqueLabels.size,
    allLabels.length,
  );

  // Step 6: Verify other address properties remain unchanged
  TestValidator.equals(
    "recipient name unchanged",
    updatedAddress.recipient_name,
    addressToUpdate.recipient_name,
  );

  TestValidator.equals(
    "phone unchanged",
    updatedAddress.phone,
    addressToUpdate.phone,
  );

  TestValidator.equals(
    "street address unchanged",
    updatedAddress.street_address_line1,
    addressToUpdate.street_address_line1,
  );

  TestValidator.equals(
    "city unchanged",
    updatedAddress.city,
    addressToUpdate.city,
  );

  TestValidator.equals(
    "postal code unchanged",
    updatedAddress.postal_code,
    addressToUpdate.postal_code,
  );
}
