import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller token refresh flow with valid refresh token from registration.
 *
 * Validates the complete token refresh workflow: a new seller registers through the
 * platform, receives an initial access token and refresh token pair, then uses the
 * refresh token to obtain new credentials without re-authentication. The test verifies
 * that token rotation is properly applied with distinct tokens issued on each refresh,
 * expiration timestamps are set to future dates, and the full seller identity is
 * correctly preserved across the refresh.
 *
 * 1. Seller registers via join endpoint, receiving initial tokens and identity.
 * 2. Seller calls refresh with the initial refresh token.
 * 3. Validates new access token is distinct from the initial one (token rotation).
 * 4. Validates new refresh token is distinct from the initial one (token rotation).
 * 5. Validates expired_at timestamp is in the future indicating a valid access token.
 * 6. Validates refreshable_until timestamp is in the future for extended session.
 * 7. Validates seller identity is preserved: same email, approval_status as "pending".
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {});
  typia.assert(joinResult);
  // 2. Refresh token using the refresh token from registration
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh: joinResult.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate token rotation
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 4. Validate expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    refreshResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshResult.token.refreshable_until > now,
  );
  // 5. Validate seller identity is preserved
  TestValidator.equals(
    "email matches registration",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "approval status is pending",
    refreshResult.approval_status,
    "pending",
  );
}
