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
 * Test successful seller token refresh workflow.
 *
 * This test validates that:
 * 1. A seller can obtain initial tokens via login
 * 2. The refresh endpoint successfully generates new tokens
 * 3. New tokens differ from original tokens
 * 4. Response includes complete seller profile
 * 5. Token expiration timestamps are valid
 */
export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Register a new seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(joinResult);
  // Step 2: Login to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  // Store original tokens
  const originalAccessToken = loginResult.token.access;
  const originalRefreshToken = loginResult.token.refresh;
  // Step 3: Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: loginResult.token.refresh,
    },
  });
  typia.assert(refreshResult);
  // Step 4: Validate the refresh response
  TestValidator.equals("seller id preserved", refreshResult.id, loginResult.id);
  TestValidator.equals(
    "seller email preserved",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.notEquals(
    "new access token differs",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  TestValidator.predicate(
    "access token is non-empty",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshResult.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const now = new Date();
  const expiredAt = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until extends beyond expired_at",
    refreshableUntil > expiredAt,
  );
}
