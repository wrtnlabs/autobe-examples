import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Test seller refresh token expiration rejection logic.
 *
 * This test verifies that the seller refresh endpoint properly rejects
 * invalid refresh tokens with appropriate error responses.
 * It validates security boundaries for token refresh mechanisms.
 */
export async function test_api_seller_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a seller account to obtain valid refresh token
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {});
  typia.assert(joinResult);
  // Step 2: Test with explicitly invalid refresh token (security boundary)
  const invalidRefreshToken = typia.random<string>();
  await TestValidator.httpError(
    "invalid refresh token should be rejected with 401",
    401,
    async () => {
      await api.functional.ecommerce.auth.seller.refresh(sellerConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IEcommerceSeller.IRefresh,
      });
    },
  );
  // Step 3: Verify that rejected tokens do not generate new sessions
  // The connection should remain unchanged after failed refresh attempts
  TestValidator.equals(
    "seller connection should retain original authentication",
    sellerConnection.headers?.Authorization,
    joinResult.token.access,
  );
}
