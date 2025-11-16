import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";

/**
 * Test updating the address_type field to change an address from residential to
 * commercial or vice versa.
 *
 * This test validates that buyers can modify the delivery location
 * classification (address_type) to ensure appropriate carrier handling and
 * delivery procedures. The test creates a buyer account, creates an address
 * with address_type set to 'residential', then updates it to 'commercial' and
 * verifies the change is correctly applied. Subsequently, it updates the
 * address back to 'residential' to confirm bidirectional type changes are
 * supported.
 *
 * Test Steps:
 *
 * 1. Create a new buyer account via join endpoint
 * 2. Create an address with address_type = 'residential'
 * 3. Update the address to change address_type to 'commercial'
 * 4. Verify the address_type changed correctly
 * 5. Update the address again to change address_type back to 'residential'
 * 6. Verify the second address_type change was successful
 */
export async function test_api_buyer_address_update_changing_address_type(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account
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

  // Step 2: Create an address with address_type = 'residential'
  const initialAddressData = {
    recipient_name: typia.random<string & tags.MaxLength<100>>(),
    phone: RandomGenerator.mobile(),
    street_address_line1: typia.random<string & tags.MaxLength<200>>(),
    street_address_line2: typia.random<string & tags.MaxLength<200>>(),
    city: typia.random<string & tags.MaxLength<100>>(),
    state: typia.random<string & tags.MaxLength<100>>(),
    postal_code: typia.random<string & tags.MaxLength<20>>(),
    country: typia.random<string & tags.MaxLength<100>>(),
    address_label: typia.random<string & tags.MaxLength<50>>(),
    address_type: "residential",
    special_delivery_instructions: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Verify initial address has residential type
  TestValidator.equals(
    "initial address type should be residential",
    createdAddress.address_type,
    "residential",
  );

  // Step 3: Update the address to change address_type to 'commercial'
  const updateToCommercial = {
    address_type: "commercial",
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedToCommercial: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: updateToCommercial,
      },
    );
  typia.assert(updatedToCommercial);

  // Step 4: Verify the address_type changed to 'commercial'
  TestValidator.equals(
    "address ID should remain the same after update",
    updatedToCommercial.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "address type should be changed to commercial",
    updatedToCommercial.address_type,
    "commercial",
  );
  TestValidator.equals(
    "recipient name should remain unchanged",
    updatedToCommercial.recipient_name,
    createdAddress.recipient_name,
  );
  TestValidator.equals(
    "phone should remain unchanged",
    updatedToCommercial.phone,
    createdAddress.phone,
  );

  // Step 5: Update the address back to 'residential'
  const updateToResidential = {
    address_type: "residential",
  } satisfies IShoppingMallBuyerAddress.IUpdate;

  const updatedToResidential: IShoppingMallBuyerAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.update(
      connection,
      {
        addressId: createdAddress.id,
        body: updateToResidential,
      },
    );
  typia.assert(updatedToResidential);

  // Step 6: Verify the address_type changed back to 'residential'
  TestValidator.equals(
    "address ID should still be the same",
    updatedToResidential.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "address type should be changed back to residential",
    updatedToResidential.address_type,
    "residential",
  );
  TestValidator.equals(
    "recipient name should still remain unchanged",
    updatedToResidential.recipient_name,
    createdAddress.recipient_name,
  );
  TestValidator.equals(
    "postal code should remain unchanged",
    updatedToResidential.postal_code,
    createdAddress.postal_code,
  );
}
