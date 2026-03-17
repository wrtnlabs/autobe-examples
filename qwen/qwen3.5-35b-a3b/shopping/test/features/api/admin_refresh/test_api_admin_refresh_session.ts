import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin session refresh workflow with valid refresh token.
 * 1. Create admin account to obtain initial refresh token
 * 2. Use refresh endpoint to obtain new access and refresh tokens
 * 3. Validate token structure and verify new tokens differ from original
 */
export async function test_api_admin_refresh_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to obtain initial refresh token
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminJoinConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(joinResult);
  // Extract refresh token from join response
  const originalRefreshToken = joinResult.token.refresh;
  const originalAccessToken = joinResult.token.access;
  // 2. Call refresh endpoint with valid refresh token
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(adminRefreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // Extract new tokens from refresh response
  const newAccessToken = refreshResult.token.access;
  const newRefreshToken = refreshResult.token.refresh;
  const newExpiredAt = refreshResult.token.expired_at;
  const newRefreshableUntil = refreshResult.token.refreshable_until;
  // 3. Validate new tokens are different from original tokens (token rotation)
  TestValidator.notEquals(
    "access token refreshed",
    newAccessToken,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    newRefreshToken,
    originalRefreshToken,
  );
  // 4. Validate token expiration timestamps: refreshable_until must be after expired_at
  const expiredAt = new Date(newExpiredAt).getTime();
  const refreshableUntil = new Date(newRefreshableUntil).getTime();
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () => refreshableUntil > expiredAt,
  );
}