import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test refresh token rotation invalidates old tokens.
 *
 * This test validates the refresh token rotation security mechanism where:
 * 1. After a successful token refresh, the old refresh token is immediately invalidated
 * 2. Attempting to reuse the old refresh token should fail with 401 Unauthorized
 * 3. This prevents token replay attacks even if an attacker intercepts a refresh token
 *
 * Test flow:
 * - Register a new seller account to obtain initial authentication tokens
 * - Successfully refresh the token to get new access and refresh tokens
 * - Attempt to use the old (previously used) refresh token again
 * - Verify the second refresh attempt fails with 401 Unauthorized error
 */
export async function test_api_seller_refresh_token_rotation_invalidates_old(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account to obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(initialAuth);
  // Store the initial refresh token before rotation
  const initialRefreshToken: string = initialAuth.token.refresh;
  // Step 2: Successfully refresh the token to get new tokens
  const refreshedAuth = await authorize_seller_refresh(sellerConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Verify we got new tokens (different from initial)
  TestValidator.notEquals(
    "refreshed access token should be different",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token should be different",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 3: Attempt to use the old refresh token again (should fail)
  await TestValidator.httpError(
    "reusing old refresh token should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.seller.refresh(sellerConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
  // Step 4: Verify that the new refresh token still works
  const reRefreshedAuth = await authorize_seller_refresh(sellerConnection, {
    body: {
      refresh_token: refreshedAuth.token.refresh,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(reRefreshedAuth);
  // Verify the new token chain is valid
  TestValidator.notEquals(
    "second refresh should produce different access token",
    refreshedAuth.token.access,
    reRefreshedAuth.token.access,
  );
}
