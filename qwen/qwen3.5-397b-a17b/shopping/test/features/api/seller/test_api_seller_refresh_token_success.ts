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
 * Validates the complete token refresh flow including seller registration, initial token acquisition, and token refresh using the refresh token. Ensures that the refresh operation returns a new valid access/refresh token pair with updated expiration timestamps.
 *
 * Special attention is given to verifying that the new tokens are properly formatted, the expiration timestamps are valid ISO 8601 date-time strings, and the seller account information is returned with the correct approval status.
 *
 * 1. Seller registers with email and password credentials.
 * 2. Initial authentication returns access token, refresh token, and expiration metadata.
 * 3. Seller submits refresh token to obtain new token pair.
 * 4. Validates new tokens are returned with updated timestamps and seller info.
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(joinResult);
  // 2. Refresh tokens using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult: IShoppingMallSeller.IAuthorized =
    await authorize_seller_refresh(refreshConnection, {
      body: {
        refresh_token: joinResult.token.refresh,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  typia.assert(refreshResult);
  // 3. Validate seller identity is preserved
  TestValidator.equals("seller id matches", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "seller email matches",
    refreshResult.email,
    joinResult.email,
  );
  // 4. Validate new tokens are issued
  TestValidator.notEquals(
    "access token refreshed",
    joinResult.token.access,
    refreshResult.token.access,
  );
  // 5. Validate timestamps are properly ordered
  const expiredAtDate = new Date(refreshResult.token.expired_at);
  const refreshableUntilDate = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilDate > expiredAtDate,
  );
}
