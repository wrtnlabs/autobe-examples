import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete workflow of an admin updating their delivery address.
 *
 * This test validates the end-to-end process of admin address management:
 *
 * 1. Admin joins the platform to establish authentication context
 * 2. Admin creates a delivery address
 * 3. Admin updates the address with modified fields
 * 4. Validates that all changes are properly reflected
 *
 * The test ensures proper authentication flow, address creation, update
 * operations, and data integrity throughout the workflow.
 */
export async function test_api_admin_address_update_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Admin joins the platform
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: RandomGenerator.pick([
      "super_admin",
      "order_manager",
      "content_moderator",
      "support_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Admin creates a delivery address
  const addressCreateData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.pick([
      "USA",
      "Canada",
      "UK",
      "Australia",
    ] as const),
  } satisfies IShoppingMallAddress.ICreate;

  const createdAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.create(connection, {
      body: addressCreateData,
    });
  typia.assert(createdAddress);

  // Validate created address has expected data (only validate properties that exist in response)
  TestValidator.equals(
    "recipient name matches",
    createdAddress.recipient_name,
    addressCreateData.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    createdAddress.phone_number,
    addressCreateData.phone_number,
  );
  TestValidator.equals(
    "address line matches",
    createdAddress.address_line1,
    addressCreateData.address_line1,
  );

  // Step 3: Admin updates the address
  const newRecipientName = RandomGenerator.name();
  const newCity = RandomGenerator.name(1);

  const addressUpdateData = {
    recipient_name: newRecipientName,
    city: newCity,
  } satisfies IShoppingMallAddress.IUpdate;

  const updatedAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.update(connection, {
      addressId: createdAddress.id,
      body: addressUpdateData,
    });
  typia.assert(updatedAddress);

  // Step 4: Validate the update results (only validate properties that exist in response)
  TestValidator.equals(
    "address ID remains same",
    updatedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipient_name,
    newRecipientName,
  );
  TestValidator.notEquals(
    "recipient name changed from original",
    updatedAddress.recipient_name,
    addressCreateData.recipient_name,
  );

  // Validate that unchanged fields remain the same
  TestValidator.equals(
    "phone number unchanged",
    updatedAddress.phone_number,
    createdAddress.phone_number,
  );
  TestValidator.equals(
    "address line unchanged",
    updatedAddress.address_line1,
    createdAddress.address_line1,
  );
}
