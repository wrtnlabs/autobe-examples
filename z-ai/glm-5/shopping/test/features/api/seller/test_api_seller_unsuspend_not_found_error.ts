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
 * Test that unsuspend operation returns appropriate error for non-existent sellers.
 *
 * **Test Flow:**
 * 1. Administrator joins and authenticates
 * 2. Administrator attempts to unsuspend using a non-existent UUID as sellerId
 * 3. Verify the operation returns 404 Not Found
 *
 * **Validation Points:**
 * - Response status: 404 Not Found
 * - Error indicates seller does not exist
 *
 * **Business Logic Verified:**
 * - System correctly validates seller existence before processing unsuspend
 * - Appropriate HTTP status code for resource not found scenarios
 */
export async function test_api_seller_unsuspend_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID that doesn't exist in the database
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to unsuspend non-existent seller and expect 404 error
  await TestValidator.httpError(
    "unsuspend non-existent seller should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.sellers.unsuspend(
        adminConnection,
        {
          sellerId: nonExistentSellerId,
        },
      );
    },
  );
}
