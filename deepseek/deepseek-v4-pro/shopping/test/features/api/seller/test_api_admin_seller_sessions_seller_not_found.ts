import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Verify that requesting session listings for a seller that does not exist returns a 404 Not Found response.
 *
 * Validates that the system correctly distinguishes between a non-existent seller and a seller that simply has no authentication sessions. When an administrator requests session listings for a seller ID that does not correspond to any existing seller (including soft-deleted ones), the API must return 404 Not Found rather than a 200 response with an empty items array.
 *
 * 1. Administrator authenticates via join to access admin-protected session listing.
 * 2. Administrator requests session listings with a randomly generated UUID that does not correspond to any seller.
 * 3. Verifies the API responds with 404 Not Found, confirming proper seller existence validation.
 */
export async function test_api_admin_seller_sessions_seller_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a non-existent seller ID
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 Not Found for non-existent seller
  await TestValidator.httpError(
    "seller not found should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        adminConnection,
        {
          sellerId: nonExistentSellerId,
          body: {} satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    },
  );
}
