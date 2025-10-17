import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin deletion of seller accounts.
 *
 * This test covers:
 *
 * - Admin authentication
 * - Seller creation for deletion candidate
 * - Seller deletion by admin
 * - Attempt to delete a non-existent seller
 * - Unauthorized deletion attempts
 *
 * The flow:
 *
 * 1. Admin joins and authenticates.
 * 2. Admin creates a seller account.
 * 3. Admin deletes the created seller.
 * 4. Confirm deletion by attempting delete again and expecting error.
 * 5. Attempt delete without admin authentication and expect failure.
 */
export async function test_api_admin_delete_seller_account(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 3. Admin deletes the created seller
  await api.functional.shoppingMall.admin.sellers.erase(connection, {
    id: seller.id,
  });

  // 4. Confirm deletion by attempting to delete again, expect error
  await TestValidator.error(
    "delete non-existent seller should throw",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(connection, {
        id: seller.id,
      });
    },
  );

  // 5. Attempt delete without admin authentication
  const unauthConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized delete should throw", async () => {
    await api.functional.shoppingMall.admin.sellers.erase(unauthConnection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
