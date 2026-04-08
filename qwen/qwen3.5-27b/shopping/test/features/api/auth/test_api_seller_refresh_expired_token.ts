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
 * Test that refreshing seller authentication with an expired or invalid refresh token returns unauthorized error.
 *
 * Validates the seller token refresh endpoint's error handling when presented with an invalid or expired refresh token. The test registers a seller account to obtain valid tokens, then attempts to refresh using an invalid token to simulate expiration.
 *
 * This ensures that the authentication system properly rejects invalid refresh attempts and returns appropriate error responses, preventing unauthorized access when tokens are no longer valid.
 *
 * 1. Register a new seller account to obtain initial authentication tokens
 * 2. Create a seller connection with the obtained tokens
 * 3. Attempt to refresh authentication with an invalid refresh token (simulating expiration)
 * 4. Verify the refresh operation fails with HTTP 401 Unauthorized status
 * 5. Confirm that no new tokens are issued and the error indicates authentication failure
 */
export async function test_api_seller_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account to obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Attempt to refresh with an invalid refresh token (simulating expired token)
  // Using an invalid token string to simulate the scenario where the refresh token has expired
  await TestValidator.httpError(
    "refresh with invalid token returns 401",
    401,
    async () => {
      await authorize_seller_refresh(sellerConnection, {
        body: {
          refresh_token: "invalid_expired_token_string",
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
