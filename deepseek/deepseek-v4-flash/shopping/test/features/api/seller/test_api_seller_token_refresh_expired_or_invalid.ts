import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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
 * Test that invalid, expired, or unrecognized refresh tokens are rejected with 401 Unauthorized.
 *
 * Validates four categories of invalid refresh tokens: non-existent random strings, empty strings, malformed short strings, and previously rotated (already used) tokens. Each case must return a 401 Unauthorized response with no new tokens issued.
 *
 * The rotated token test case requires a full seller join and refresh cycle to first obtain a valid token pair and then invalidate it through a refresh operation.
 *
 * 1. Seller registration via authorize_seller_join to obtain a valid token pair.
 * 2. Use the valid refresh token to refresh (rotates/invalidates the old token).
 * 3. Verify the rotated token is rejected with 401.
 * 4. Verify random, empty, and malformed tokens are also rejected with 401.
 */
export async function test_api_seller_token_refresh_expired_or_invalid(
  connection: api.IConnection,
): Promise<void> {
  // ---- Test 1: Random non-existent refresh token ----
  await TestValidator.httpError("random refresh token", 401, async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await authorize_seller_refresh(refreshConnection, {
      body: {
        refreshToken: RandomGenerator.alphaNumeric(64),
      } satisfies IECommerceMallSeller.IRefresh,
    });
  });
  // ---- Test 2: Empty refresh token ----
  await TestValidator.httpError("empty refresh token", 401, async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await authorize_seller_refresh(refreshConnection, {
      body: {
        refreshToken: "",
      } satisfies IECommerceMallSeller.IRefresh,
    });
  });
  // ---- Test 3: Malformed (short) refresh token ----
  await TestValidator.httpError("malformed refresh token", 401, async () => {
    const refreshConnection: api.IConnection = { host: connection.host };
    await authorize_seller_refresh(refreshConnection, {
      body: {
        refreshToken: "short",
      } satisfies IECommerceMallSeller.IRefresh,
    });
  });
  // ---- Test 4: Previously rotated (used) refresh token ----
  // First, create a seller and get a valid token pair
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // Capture the original refresh token before rotating it
  const originalRefreshToken = authorized.token.refresh;
  // Use the valid refresh token to get new tokens — this rotates/invalidates the old one
  const rotateConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(rotateConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IECommerceMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  // Now the original refresh token should be invalidated
  await TestValidator.httpError(
    "previously rotated refresh token",
    401,
    async () => {
      const staleConnection: api.IConnection = { host: connection.host };
      await authorize_seller_refresh(staleConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IECommerceMallSeller.IRefresh,
      });
    },
  );
}
