import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test cross-seller password reset token access prevention.
 *
 * Validates that the password reset token retrieval endpoint enforces seller-scoped access control. An administrator attempts to retrieve a password reset token that belongs to seller A, but substitutes seller B's identifier in the sellerId path parameter. The system must return a 404 Not Found error, preventing information leakage and ensuring that reset tokens are only accessible within the context of their owning seller.
 *
 * The security rule under test is that the sellerId path parameter must match the shopping_mall_seller_id on the password reset record. Even though the resetId is valid in the database, the sellerId mismatch results in a 404 response, as the record is not accessible under a different seller's context.
 *
 * 1. Administrator authenticates using the join utility to access admin endpoints.
 * 2. Administrator browses seller accounts to identify two distinct sellers (seller A and seller B).
 * 3. Administrator lists password reset tokens for seller A to obtain a valid resetId.
 * 4. Administrator attempts to retrieve seller A's reset token using seller B's sellerId, expecting a 404 error.
 */
export async function test_api_admin_seller_password_reset_cross_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Browse sellers to find two distinct sellers
  const sellersPage = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sellersPage);
  TestValidator.predicate(
    "at least two sellers required for cross-seller test",
    sellersPage.data.length >= 2,
  );
  const sellerA = sellersPage.data[0];
  const sellerB = sellersPage.data[1];
  // 3. List password reset tokens for seller A
  const resetsPage =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: sellerA.id,
        body: {} satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(resetsPage);
  TestValidator.predicate(
    "seller A must have at least one password reset token",
    resetsPage.data.length >= 1,
  );
  const resetA = resetsPage.data[0];
  // 4. Attempt cross-seller access: use seller B's ID with seller A's reset token
  await TestValidator.httpError(
    "cross-seller password reset access must return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.sellers.password_resets.at(
        adminConnection,
        {
          sellerId: sellerB.id,
          resetId: resetA.id,
        },
      );
    },
  );
}
