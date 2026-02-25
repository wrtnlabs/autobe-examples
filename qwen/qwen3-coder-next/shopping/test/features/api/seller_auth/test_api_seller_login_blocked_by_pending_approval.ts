import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test login rejection for seller accounts with pending approval status.
 * 1. Register a seller account with pending approval status
 * 2. Attempt to login with the pending seller account
 * 3. Verify that login is properly rejected with appropriate error
 */
export async function test_api_seller_login_blocked_by_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller with pending approval status
  const pendingSellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: pendingSellerEmail,
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  typia.assert(joinResult.token);
  // Use joinResult to check seller approval status
  TestValidator.equals(
    "seller approval status is pending",
    joinResult.approval_status,
    "pending",
  );
  // Step 2: Attempt login with pending seller account - should be rejected
  await TestValidator.error(
    "login should be rejected for pending approval seller account",
    async () => {
      await authorize_seller_login(sellerConnection, {
        body: {
          email: pendingSellerEmail,
          password: "TestPassword123!",
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
