import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform administrator can retrieve the full business and
 * registration details of a specific seller using their unique sellerId.
 *
 * Steps:
 *
 * 1. Register a new admin account to obtain authentication.
 * 2. Use the issued admin token to call GET
 *    /shoppingMall/admin/sellers/{sellerId}.
 * 3. Verify the response includes all key seller fields and matches the known
 *    values for the seller.
 * 4. Confirm that requests with nonexistent sellerId return proper 'Not Found'
 *    error.
 * 5. Ensure no unauthorized users (without or with a non-admin token) can access
 *    this endpoint.
 */
export async function test_api_seller_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Simulate existence of a seller (no seller creation endpoint exists)
  const seller: IShoppingMallSeller = typia.random<IShoppingMallSeller>();
  typia.assert(seller);

  // 3. As admin, call GET /shoppingMall/admin/sellers/{sellerId}
  const retrieved: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: seller.id,
    });
  typia.assert(retrieved);

  // 4. Assert all key fields match
  TestValidator.equals("seller.id matches", retrieved.id, seller.id);
  TestValidator.equals("seller.email matches", retrieved.email, seller.email);
  TestValidator.equals(
    "seller.business_name matches",
    retrieved.business_name,
    seller.business_name,
  );
  TestValidator.equals(
    "seller.registration_number matches",
    retrieved.registration_number,
    seller.registration_number,
  );
  TestValidator.equals(
    "seller.business_phone matches",
    retrieved.business_phone,
    seller.business_phone,
  );
  TestValidator.equals(
    "seller.is_email_verified matches",
    retrieved.is_email_verified,
    seller.is_email_verified,
  );
  TestValidator.equals(
    "seller.status matches",
    retrieved.status,
    seller.status,
  );
  TestValidator.equals(
    "seller.created_at matches",
    retrieved.created_at,
    seller.created_at,
  );
  TestValidator.equals(
    "seller.updated_at matches",
    retrieved.updated_at,
    seller.updated_at,
  );

  // 5. Negative: GET /shoppingMall/admin/sellers/{nonexistentSellerId}
  const nonexistentSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Nonexistent sellerId returns Not Found",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(connection, {
        sellerId: nonexistentSellerId,
      });
    },
  );

  // 6. Unauthorized: Unauthenticated users cannot retrieve seller details
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated cannot access seller detail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(unauthConn, {
        sellerId: seller.id,
      });
    },
  );
}
