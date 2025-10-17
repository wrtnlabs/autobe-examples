import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete workflow for admin retrieval of a specific delivery
 * address.
 *
 * This test validates the admin's ability to create and retrieve delivery
 * addresses. The workflow includes:
 *
 * 1. Admin account creation through authentication
 * 2. Creating a delivery address for the admin
 * 3. Retrieving the address by its unique ID
 * 4. Validating all address fields match the created data
 *
 * The test confirms that admins have platform-wide access to address data and
 * that address records contain complete information including recipient
 * details, street address components, and system-generated identifiers.
 */
export async function test_api_address_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
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

  // Step 2: Create a delivery address for the admin
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
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: RandomGenerator.pick([
      "United States",
      "Canada",
      "United Kingdom",
      "Australia",
      "Germany",
    ] as const),
  } satisfies IShoppingMallAddress.ICreate;

  const createdAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.create(connection, {
      body: addressCreateData,
    });
  typia.assert(createdAddress);

  // Step 3: Retrieve the address by its ID
  const retrievedAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.at(connection, {
      addressId: createdAddress.id,
    });
  typia.assert(retrievedAddress);

  // Step 4: Validate the retrieved address matches the created address
  TestValidator.equals(
    "retrieved address ID matches created address",
    retrievedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipient_name,
    addressCreateData.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    retrievedAddress.phone_number,
    addressCreateData.phone_number,
  );
  TestValidator.equals(
    "address line 1 matches",
    retrievedAddress.address_line1,
    addressCreateData.address_line1,
  );
}
