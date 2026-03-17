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
 * Test token refresh failure when refresh token has expired. A seller joins and obtains tokens, then waits until refresh token expiration time passes. When attempting to refresh with the expired token, the system validates against session records, detects the token has passed its expiration time, rejects the refresh request, and requires the seller to re-authenticate using login credentials. Verify the system returns appropriate error indicating token expiration.
 */
export async function test_api_seller_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account to obtain initial authentication tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Extract refresh token and its expiration timestamp
  const refreshToken: string = authorized.token.refresh;
  const refreshableUntil: string = authorized.token.refreshable_until;
  // 3. Wait until refresh token expiration time passes
  const expirationTime = new Date(refreshableUntil).getTime();
  const currentTime = Date.now();
  const waitMs = expirationTime - currentTime;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  // 4. Attempt to refresh with expired token - should fail with 401
  await TestValidator.httpError(
    "expired refresh token should be rejected",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.seller.refresh(connection, {
        body: {
          refreshToken: refreshToken,
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
}
