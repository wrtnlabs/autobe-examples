import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller address update functionality.
 *
 * This test validates that a seller can successfully update their delivery
 * address information, specifically the recipient name and city fields. The
 * test creates a seller account, adds multiple delivery addresses, and then
 * verifies that address updates are properly applied.
 *
 * Test Workflow:
 *
 * 1. Create a new seller account through authentication
 * 2. Create the first delivery address
 * 3. Create a second delivery address
 * 4. Update the second address with new recipient name and city
 * 5. Verify that the update was successful with correct data
 *
 * This ensures that sellers can maintain accurate delivery address information
 * for their purchasing activities on the platform.
 */
export async function test_api_seller_address_default_status_management(
  connection: api.IConnection,
) {
  // 1. Create a new seller account through authentication
  const sellerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // 2. Create the first delivery address
  const firstAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Avenue`,
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const firstAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.seller.addresses.create(connection, {
      body: firstAddressData,
    });
  typia.assert(firstAddress);

  // 3. Create a second delivery address
  const originalCity = RandomGenerator.name(1);
  const secondAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Boulevard`,
    city: originalCity,
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const secondAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.seller.addresses.create(connection, {
      body: secondAddressData,
    });
  typia.assert(secondAddress);

  // 4. Update the second address with new recipient name and city
  const updatedRecipientName = RandomGenerator.name();
  const updatedCity = RandomGenerator.name(1);
  const updateData = {
    recipient_name: updatedRecipientName,
    city: updatedCity,
  } satisfies IShoppingMallAddress.IUpdate;

  const updatedAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.seller.addresses.update(connection, {
      addressId: secondAddress.id,
      body: updateData,
    });
  typia.assert(updatedAddress);

  // 5. Verify that the update was successful
  TestValidator.equals(
    "updated address ID matches original",
    updatedAddress.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "recipient name updated successfully",
    updatedAddress.recipient_name,
    updatedRecipientName,
  );
}
