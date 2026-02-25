import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that attempting to approve a non-existent seller returns 404 error.
 *
 * This test validates proper error handling when an administrator attempts
 * to approve a seller that does not exist in the database. The system should
 * return a 404 Not Found error rather than proceeding with the operation.
 *
 * Steps:
 * 1. Create admin-specific connection and authenticate as administrator
 * 2. Generate a valid UUID that does not correspond to any existing seller
 * 3. Attempt to approve the non-existent seller
 * 4. Verify the operation fails with 404 Not Found error
 */
export async function test_api_seller_approval_nonexistent_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a UUID that doesn't correspond to any existing seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to approve non-existent seller and verify 404 error
  await TestValidator.httpError(
    "non-existent seller approval should fail with 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
