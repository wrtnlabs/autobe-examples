import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Permanently deletes a seller from the shopping mall platform as an authorized
 * admin.
 *
 * 1. Register a new admin account (admin join)
 * 2. Register a new seller account (seller join)
 * 3. As the authenticated admin, erase the seller account using DELETE
 *    /shoppingMall/admin/sellers/{sellerId}
 * 4. (Optional: Check that the seller is irreversibly deleted by attempting
 *    further business logic, if such API exists)
 *
 * Key validation: Only an admin can perform the permanent erase operation. The
 * seller data is gone after the operation (irrecoverable deletion confirmed by
 * the success of the operation and inability to reference the seller
 * thereafter).
 */
export async function test_api_seller_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuth);

  // 2. Register a seller (as any actor; registration does not require admin)
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller.example.com/", // realistic sample uri
    referrer: "https://referrer.example.com/",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(sellerAuth);

  // 3. As authenticated admin, erase the seller.
  // (The SDK updates the token automatically on join)
  await api.functional.shoppingMall.admin.sellers.erase(connection, {
    sellerId: sellerAuth.id,
  });

  // 4. (Optional) Attempt to delete again—should fail as seller no longer exists.
  await TestValidator.error(
    "deleting already deleted seller should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(connection, {
        sellerId: sellerAuth.id,
      });
    },
  );
}
