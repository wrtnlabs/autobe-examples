import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that an admin can remove a business address from a seller's address
 * book.
 *
 * This test covers:
 *
 * 1. Admin registration and authentication.
 * 2. Attempt to delete an address for a specific seller by UUIDs (as actual
 *    address creation/listing is not available in the SDK).
 * 3. Confirm the erase operation completes without error (void return, no
 *    exception).
 * 4. (If API for reading addresses existed, verify the address is no longer
 *    present. But since listing/read functions are not provided, this step is
 *    not implemented.)
 * 5. Ensures that only authenticated admins are able to perform this action by
 *    validating with valid session.
 *
 * Steps:
 *
 * 1. Register a new platform admin using api.functional.auth.admin.join. Validate
 *    result using typia.assert().
 * 2. Call api.functional.shoppingMall.admin.sellers.addresses.erase with random
 *    sellerId and addressId (uuid format). There are no dependencies as the SDK
 *    does not provide address creation or listing endpoints/types.
 * 3. Confirm that the erase operation returns void and does not throw (success
 *    scenario).
 * 4. Optionally, test that calling erase with the same sellerId/addressId again
 *    results in error (address already deleted or does not exist).
 *
 *    - Since error shape is not defined, only TestValidator.error is used to detect
 *         an error is thrown.
 */
export async function test_api_seller_address_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Generate random sellerId and addressId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // 3. Erase the address as admin
  const output =
    await api.functional.shoppingMall.admin.sellers.addresses.erase(
      connection,
      { sellerId, addressId },
    );
  TestValidator.equals("erase returns void", output, undefined);

  // 4. Ensure further delete attempts raise error (since address should be gone already)
  await TestValidator.error(
    "re-deleting already deleted/non-existent address should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.addresses.erase(
        connection,
        { sellerId, addressId },
      );
    },
  );
}
