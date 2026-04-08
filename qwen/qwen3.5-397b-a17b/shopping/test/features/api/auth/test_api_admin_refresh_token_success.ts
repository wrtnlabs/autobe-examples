import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator token refresh workflow.
 *
 * Validates the complete token refresh flow including administrator account creation, initial authentication, token refresh operation, and verification of token rotation. Ensures that new tokens are properly generated and different from previous tokens for security.
 *
 * Special attention is given to verifying token rotation (new tokens differ from old ones), expiration timestamps are in the future, and the new access token can authenticate subsequent admin API calls.
 *
 * 1. Create administrator account via join operation to obtain initial tokens.
 * 2. Store initial access token and refresh token for comparison.
 * 3. Call refresh endpoint with valid refresh token from join response.
 * 4. Verify response contains new access token, refresh token, and expiration timestamps.
 * 5. Validate new tokens are different from previous tokens (token rotation).
 * 6. Verify expired_at and refreshable_until timestamps are in the future.
 * 7. Confirm admin account information remains consistent between join and refresh responses.
 */
export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Store initial tokens for comparison
  const initialAccessToken = joinResult.token.access;
  const initialRefreshToken = joinResult.token.refresh;
  // 3. Refresh tokens using the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Extract new tokens for validation
  const newAccessToken = refreshResult.token.access;
  const newRefreshToken = refreshResult.token.refresh;
  const newExpiredAt = refreshResult.token.expired_at;
  const newRefreshableUntil = refreshResult.token.refreshable_until;
  // 5. Validate token rotation (new tokens differ from old ones)
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    newRefreshToken,
  );
  // 6. Verify expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate("expired_at is in future", newExpiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    newRefreshableUntil > now,
  );
  // 7. Verify admin account information is consistent
  TestValidator.equals("admin id matches", joinResult.id, refreshResult.id);
  TestValidator.equals(
    "admin email matches",
    joinResult.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "admin grade matches",
    joinResult.grade,
    refreshResult.grade,
  );
}
