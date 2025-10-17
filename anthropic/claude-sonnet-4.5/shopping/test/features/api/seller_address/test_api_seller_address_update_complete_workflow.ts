import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_address_update_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account with business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
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

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create initial delivery address
  const initialAddressData = {
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

  const createdAddress =
    await api.functional.shoppingMall.seller.addresses.create(connection, {
      body: initialAddressData,
    });
  typia.assert(createdAddress);

  // Verify initial address creation
  TestValidator.equals(
    "created address recipient matches",
    createdAddress.recipient_name,
    initialAddressData.recipient_name,
  );
  TestValidator.equals(
    "created address phone matches",
    createdAddress.phone_number,
    initialAddressData.phone_number,
  );
  TestValidator.equals(
    "created address street matches",
    createdAddress.address_line1,
    initialAddressData.address_line1,
  );

  // Step 3: Update address with modified fields
  const updatedRecipientName = RandomGenerator.name();
  const updatedCity = RandomGenerator.name(1);

  const updateData = {
    recipient_name: updatedRecipientName,
    city: updatedCity,
  } satisfies IShoppingMallAddress.IUpdate;

  const updatedAddress =
    await api.functional.shoppingMall.seller.addresses.update(connection, {
      addressId: createdAddress.id,
      body: updateData,
    });
  typia.assert(updatedAddress);

  // Step 4: Verify address updates were applied correctly
  TestValidator.equals(
    "updated address ID matches original",
    updatedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "updated address recipient name changed",
    updatedAddress.recipient_name,
    updatedRecipientName,
  );
  TestValidator.equals(
    "updated address phone number unchanged",
    updatedAddress.phone_number,
    initialAddressData.phone_number,
  );
  TestValidator.equals(
    "updated address street unchanged",
    updatedAddress.address_line1,
    initialAddressData.address_line1,
  );
}
