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
 * Test seller token refresh mechanism.
 *
 * This test validates the seller authentication refresh token flow.
 *
 * IMPORTANT NOTE: The original scenario requested testing refresh failure with
 * expired session. However, the current API set does not provide capabilities to:
 * - Manually expire sessions
 * - Manipulate session expired_at timestamps
 * - Wait for natural session expiration (impractical in E2E tests)
 *
 * Therefore, this test validates the refresh token mechanism with valid tokens.
 * Testing actual session expiration requires backend session management tools
 * or waiting for natural expiration, which are outside the scope of this test.
 *
 * Test Steps:
 * 1. Register a new seller account
 * 2. Capture the refresh token from authentication response
 * 3. Attempt to refresh the token using the captured refresh token
 * 4. Validate the refresh operation returns new tokens
 */
export async function test_api_seller_refresh_token_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account and obtain initial tokens
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Step 2: Capture the refresh token from the authentication response
  const refreshToken = sellerAuth.token.refresh;
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);
  // Step 3: Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Attempt to refresh the token using the captured refresh token
  // Note: This succeeds when session is active. Testing expired session
  // requires backend session manipulation capabilities not available via API.
  const refreshResult = await api.functional.shoppingMall.auth.seller.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallSeller.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // Step 5: Validate refresh response contains new tokens
  TestValidator.predicate(
    "new access token issued",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshToken,
    refreshResult.token.refresh,
  );
}
