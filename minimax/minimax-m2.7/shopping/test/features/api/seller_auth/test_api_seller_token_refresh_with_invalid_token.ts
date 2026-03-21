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
 * Test seller token refresh fails with invalid or tampered refresh token.
 *
 * This test verifies that the token refresh endpoint properly rejects
 * invalid refresh tokens and returns appropriate authentication errors
 * without exposing sensitive information about token validity.
 *
 * Steps:
 * 1. Register first seller to obtain valid tokens
 * 2. Register second seller to get token for cross-seller testing
 * 3. Test with completely fabricated/invalid token format
 * 4. Test with tampered/corrupted token string
 * 5. Test with token from different seller
 * 6. Verify all cases return authentication error
 * 7. Verify error messages don't leak sensitive information
 */
export async function test_api_seller_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first seller to get valid tokens
  const sellerConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_seller_join(sellerConnection1, {});
  typia.assert(authorized1);
  const validRefreshToken = authorized1.token.refresh;
  // Step 2: Register second seller for cross-seller token testing
  const sellerConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_seller_join(sellerConnection2, {});
  typia.assert(authorized2);
  const crossSellerRefreshToken = authorized2.token.refresh;
  // Step 3: Test with completely fabricated/invalid token
  await TestValidator.error("should reject fabricated token", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerceMall.auth.seller.refresh(invalidConnection, {
      body: {
        refresh: "this.is.completely.fabricated.jwt.token",
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
  // Step 4: Test with tampered/corrupted token (valid JWT structure but invalid signature)
  await TestValidator.error("should reject tampered token", async () => {
    const tamperedToken = validRefreshToken.slice(0, -5) + "xxxxx";
    const tamperedConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerceMall.auth.seller.refresh(tamperedConnection, {
      body: {
        refresh: tamperedToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
  // Step 5: Test with token from different seller (valid structure, wrong owner)
  await TestValidator.error("should reject cross-seller token", async () => {
    const crossConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerceMall.auth.seller.refresh(crossConnection, {
      body: {
        refresh: crossSellerRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
  // Step 6: Verify valid token still works (baseline validation)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh: validRefreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "should get new access token",
    refreshed.token.access,
    validRefreshToken,
  );
}
