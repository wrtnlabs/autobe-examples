import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
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
 * Test administrator retrieval of a non-existent seller password reset token.
 *
 * Validates that the password reset token lookup endpoint correctly handles the case where the provided resetId does not correspond to any existing password reset record. The administrator browses the seller listing to obtain a valid seller identifier, then attempts to retrieve a password reset using a randomly generated, non-existent resetId.
 *
 * The endpoint must return a 404 Not Found error when the resetId exists in UUID format but does not match any record in the database. This ensures the not-found error handling is properly implemented at the path-parameter level.
 *
 * 1. Administrator registers and authenticates with randomized credentials via authorize_admin_join.
 * 2. Administrator browses the seller listing to obtain a valid seller identifier from existing sellers.
 * 3. Administrator attempts to retrieve a password reset token using the valid sellerId but a randomly generated, non-existent resetId.
 * 4. Validates that the endpoint returns a 404 Not Found error, confirming proper not-found error handling for the resetId path parameter.
 */
export async function test_api_admin_seller_password_reset_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Browse sellers to get a valid sellerId
  const sellersPage = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sellersPage);
  TestValidator.predicate(
    "seller listing must have at least one seller",
    sellersPage.data.length > 0,
  );
  const seller = sellersPage.data[0];
  // 3. Attempt to retrieve non-existent password reset
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent password reset returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.sellers.password_resets.at(
        adminConnection,
        {
          sellerId: seller.id,
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
