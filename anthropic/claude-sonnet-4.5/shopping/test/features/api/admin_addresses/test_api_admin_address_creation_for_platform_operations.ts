import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin delivery address creation for platform operations.
 *
 * This test validates that admins can create delivery addresses for their own
 * purchases and platform testing needs. Since admins inherit all customer and
 * seller permissions, they need the ability to manage delivery addresses.
 *
 * Test workflow:
 *
 * 1. Create a new admin account through admin join endpoint
 * 2. Admin is automatically authenticated after account creation
 * 3. Create a delivery address with complete recipient information
 * 4. Validate that the address is properly created and associated with admin
 * 5. Verify all required fields are present in the response
 */
export async function test_api_admin_address_creation_for_platform_operations(
  connection: api.IConnection,
) {
  // Step 1: Create admin account (automatically authenticates)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });

  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Create delivery address for the admin
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.admin.addresses.create(connection, {
      body: addressData,
    });

  typia.assert(address);

  // Step 3: Validate address creation
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    addressData.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    addressData.phone_number,
  );
  TestValidator.equals(
    "address line matches",
    address.address_line1,
    addressData.address_line1,
  );
}
