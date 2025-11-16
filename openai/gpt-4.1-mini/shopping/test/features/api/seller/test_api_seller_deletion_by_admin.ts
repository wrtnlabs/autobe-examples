import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to obtain credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "StrongAdminPassword123!",
        phone_number: null,
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a seller user account to be deleted
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass!234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Admin deletes the seller
  await api.functional.shoppingMall.admin.sellers.erase(connection, {
    sellerId: seller.id,
  });

  // 4. Verify seller deletion by attempting deletion again (should error)
  await TestValidator.error(
    "deleting already deleted seller should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(connection, {
        sellerId: seller.id,
      });
    },
  );

  // 5. Attempt deletion without admin authorization (simulate by empty headers connection)
  const unauthConnect: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized seller deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(unauthConnect, {
        sellerId: seller.id,
      });
    },
  );
}
