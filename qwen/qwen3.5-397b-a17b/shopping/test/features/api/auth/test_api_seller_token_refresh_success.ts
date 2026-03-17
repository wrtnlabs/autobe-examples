import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test successful token refresh for a seller with valid refresh token.
 *
 * 1. Seller registers via join endpoint to obtain initial authentication tokens
 * 2. Seller calls the refresh endpoint with the refresh token from initial authentication
 * 3. Verify response contains new access and refresh tokens with valid expiration timestamps
 * 4. Verify seller account information (id, email, shop_name, approval_status) is correctly returned
 * 5. Verify new tokens are different from original tokens (token rotation)
 * 6. Verify expiration timestamps are in the future
 *
 * This validates the primary success path of the token refresh workflow.
 */
export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account to obtain initial tokens
  const joinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Refresh token using the refresh token from join result
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: joinResult.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Verify seller account information is preserved after refresh
  TestValidator.equals("seller id matches", joinResult.id, refreshResult.id);
  TestValidator.equals("email matches", joinResult.email, refreshResult.email);
  TestValidator.equals(
    "shop name matches",
    joinResult.shop_name,
    refreshResult.shop_name,
  );
  TestValidator.equals(
    "approval status matches",
    joinResult.approval_status,
    refreshResult.approval_status,
  );
  // 4. Verify new tokens are different from original tokens (token rotation)
  TestValidator.notEquals(
    "access token refreshed",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // 5. Verify expiration timestamps are valid (in the future)
  TestValidator.predicate(
    "access token has future expiration",
    refreshResult.token.expired_at > new Date().toISOString(),
  );
  TestValidator.predicate(
    "refresh token has future expiration",
    refreshResult.token.refreshable_until > new Date().toISOString(),
  );
  // 6. Verify new access token is non-empty and usable
  TestValidator.predicate(
    "new access token is valid",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is valid",
    refreshResult.token.refresh.length > 0,
  );
}
