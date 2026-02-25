import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller with pending approval status cannot login and receives an
 * appropriate approval-required error.
 *
 * This test validates the business rule that only approved sellers can access
 * the platform through login. When a seller registers, they are created with
 * approval_status='pending' and must await administrator approval before they
 * can successfully authenticate.
 *
 * Test flow:
 * 1. Register a new seller via join endpoint (creates pending status)
 * 2. Verify seller has 'pending' approval status
 * 3. Attempt to login with valid credentials
 * 4. Validate that login is rejected with appropriate error
 */
export async function test_api_seller_login_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for the pending seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Create a new seller account via join endpoint
  // The join endpoint creates sellers with approval_status='pending'
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(joinResult);
  // Step 2: Verify the seller has pending approval status
  TestValidator.equals(
    "seller approval status should be pending",
    joinResult.approvalStatus,
    "pending",
  );
  // Step 3 & 4: Attempt to login with the pending seller's credentials
  // This should fail because the seller is not yet approved
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("pending seller cannot login", async () => {
    await api.functional.shoppingMall.auth.seller.login(loginConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
}
