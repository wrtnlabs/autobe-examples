import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_suspension_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IShoppingMallAdmin.IJoin = typia.random<IShoppingMallAdmin.IJoin>();
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCreds },
  );
  typia.assert(admin);
  // Step 2: Create active seller account to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCreds: IShoppingMallSeller.IJoin = typia.random<IShoppingMallSeller.IJoin>();
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    { body: sellerCreds },
  );
  typia.assert(seller);
  TestValidator.equals(
    "seller status should be approved",
    seller.status,
    "approved",
  );
  TestValidator.equals(
    "seller should not be suspended",
    seller.is_suspended,
    false,
  );
  // Step 3: Use admin connection to suspend the seller
  await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
    sellerId: seller.seller_id,
  });
  // Step 4: Validate that seller authentication is revoked after suspension
  // Try to authenticate seller with original credentials - this should fail
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller authentication should be revoked after suspension",
    async () => {
      await authorize_seller_login(sellerLoginConnection, {
        body: {
          email: sellerCreds.email,
          password: sellerCreds.password,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
  // The test is complete. We have validated the only possible aspect:
  // 1. Admin can authenticate
  // 2. Seller can be created and authenticated
  // 3. Admin can suspend seller
  // 4. Suspended seller cannot authenticate
  // All other aspects (suspended_at timestamp, product visibility, profile snapshots)
  // require non-existent API endpoints or are not available in any of the provided
  // DTOs or endpoints. We only test what is possible with the given API.
}