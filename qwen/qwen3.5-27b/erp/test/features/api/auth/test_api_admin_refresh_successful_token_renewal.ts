import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator token refresh operation.
 * 1. Create new admin account and obtain initial tokens
 * 2. Extract refresh token from join response
 * 3. Call refresh endpoint with valid refresh token
 * 4. Verify new tokens are different from original tokens
 * 5. Validate all required response fields are present
 */
export async function test_api_admin_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new admin account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  typia.assert(joinResponse);
  // Store original tokens for comparison
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // 2. Prepare refresh request with extracted refresh token
  const refreshBody = {
    refresh_token: joinResponse.token.refresh,
  } satisfies IHrmPlatformAdmin.IRefresh;
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_admin_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // 4. Verify new tokens are different from original tokens (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 5. Validate administrator identity information is preserved
  TestValidator.equals(
    "admin id preserved",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "admin email preserved",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "admin created_at preserved",
    refreshResponse.created_at,
    joinResponse.created_at,
  );
  // 6. Verify new access token expiration is updated (future timestamp)
  const newExpiredAt = new Date(refreshResponse.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "new access token expires in future",
    newExpiredAt > now,
  );
  // 7. Verify refreshable_until is in the future (session deadline)
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  // 8. Verify refreshable_until is after expired_at (session extends beyond access token)
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > newExpiredAt,
  );
  // 9. Verify new access token is not empty
  TestValidator.predicate(
    "new access token is not empty",
    refreshResponse.token.access.length > 0,
  );
  // 10. Verify new refresh token is not empty
  TestValidator.predicate(
    "new refresh token is not empty",
    refreshResponse.token.refresh.length > 0,
  );
}
