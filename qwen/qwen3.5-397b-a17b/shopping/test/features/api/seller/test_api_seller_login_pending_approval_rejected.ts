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
 * Test seller login failure when account has pending approval status.
 *
 * Validates that a newly registered seller with pending approval status cannot authenticate to the platform. This test ensures the seller approval workflow is enforced by preventing login attempts before admin approval.
 *
 * The test registers a new seller account which is automatically created with approval_status='pending', then immediately attempts to login with the registered credentials. The login should fail with an appropriate error indicating that admin approval is required.
 *
 * 1. Register a new seller account with valid email and password via /shoppingMall/auth/seller/join.
 * 2. Verify the account is created with approval_status='pending'.
 * 3. Attempt to login via /shoppingMall/auth/seller/login with the registered credentials.
 * 4. Validate that login fails with HTTP 4xx error indicating approval is required.
 * 5. Confirm no authorization tokens are returned and no session is created.
 */
export async function test_api_seller_login_pending_approval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (approval_status='pending' by default)
  const password = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 2. Verify the account has pending approval status
  TestValidator.equals(
    "approval status is pending",
    sellerJoinResult.approval_status,
    "pending",
  );
  // 3. Create a new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Attempt login with pending seller credentials - should fail with approval error
  await TestValidator.error("login fails for pending seller", async () => {
    await api.functional.shoppingMall.auth.seller.login(loginConnection, {
      body: {
        email: sellerJoinResult.email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.ILogin,
    });
  });
}
