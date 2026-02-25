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
 * Test seller token refresh with an expired/invalid refresh token.
 *
 * This test validates that the refresh endpoint properly rejects invalid
 * or expired refresh tokens, ensuring security by preventing unauthorized
 * session extension.
 *
 * Scenario:
 * 1. Use an invalid/fake refresh token that doesn't exist in any active session
 * 2. Attempt to call the refresh endpoint with this invalid token
 * 3. Verify the request fails with an error (401 Unauthorized)
 *
 * The test uses a fabricated token since:
 * - An invalid token (not in sessions table) triggers the same validation failure
 * - It's impractical to wait for actual token expiration in E2E tests
 * - Both cases result in rejection, testing the same security boundary
 */
export async function test_api_seller_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Generate an invalid refresh token that won't exist in any session
  const invalidRefreshToken = typia.random<string & tags.MinLength<1>>();
  // Attempt to refresh with the invalid token - should fail
  await TestValidator.httpError(
    "refresh with invalid token should return 401",
    401,
    async () => {
      await api.functional.shoppingMall.auth.seller.refresh(connection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
