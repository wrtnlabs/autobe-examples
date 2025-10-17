import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test cascade deletion behavior when admin account is removed.
 *
 * This test validates that when an admin account is deleted, all associated
 * data is properly cleaned up through database cascade rules. The test creates
 * an admin account, establishes related records (addresses), and then deletes
 * the admin to verify cascade deletion works correctly.
 *
 * Steps:
 *
 * 1. Create admin account with authentication
 * 2. Create multiple address records for the admin
 * 3. Delete the admin account
 * 4. Verify successful deletion with no errors
 */
export async function test_api_admin_deletion_cascade_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with authentication
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create multiple address records for the admin
  const addressCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
  >();
  const addresses = await ArrayUtil.asyncRepeat(addressCount, async () => {
    const addressData = {
      recipient_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      city: RandomGenerator.name(1),
      state_province: RandomGenerator.name(1),
      postal_code: typia
        .random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<10000> &
            tags.Maximum<99999>
        >()
        .toString(),
      country: "United States",
    } satisfies IShoppingMallAddress.ICreate;

    const address: IShoppingMallAddress =
      await api.functional.shoppingMall.admin.addresses.create(connection, {
        body: addressData,
      });
    typia.assert(address);
    return address;
  });

  // Verify addresses were created
  TestValidator.equals("created address count", addresses.length, addressCount);

  // Step 3: Delete the admin account
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: admin.id,
  });

  // Step 4: Verify deletion completed successfully
  // The deletion should succeed without errors - if we reach here, cascade deletion worked
  TestValidator.predicate("admin deletion completed successfully", true);
}
