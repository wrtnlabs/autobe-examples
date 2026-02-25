import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful token refresh workflow.
 *
 * Validates that a user can successfully refresh their authentication tokens
 * using a valid refresh token, receiving new access and refresh tokens.
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and get initial tokens
  const userConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_user_join(userConnection, {});
  typia.assert(initialAuth);
  // Store original tokens and user info
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  const userId = initialAuth.id;
  const displayName = initialAuth.display_name;
  // 2. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_user_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify response contains new tokens
  TestValidator.predicate(
    "new access token is a non-empty string",
    typeof refreshedAuth.token.access === "string" &&
      refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is a non-empty string",
    typeof refreshedAuth.token.refresh === "string" &&
      refreshedAuth.token.refresh.length > 0,
  );
  // 4. Verify user id and display_name match
  TestValidator.equals("user id matches", refreshedAuth.id, userId);
  TestValidator.equals(
    "display_name matches",
    refreshedAuth.display_name,
    displayName,
  );
  // 5. Verify expired_at is approximately 15 minutes from now
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const expectedExpiredAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
  const expiredAtDiff = Math.abs(
    expiredAt.getTime() - expectedExpiredAt.getTime(),
  );
  TestValidator.predicate(
    "expired_at is approximately 15 minutes from now",
    expiredAtDiff < 5 * 60 * 1000,
  );
  // 6. Verify refreshable_until is approximately 30 days from now
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  const expectedRefreshableUntil = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ); // 30 days
  const refreshableDiff = Math.abs(
    refreshableUntil.getTime() - expectedRefreshableUntil.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is approximately 30 days from now",
    refreshableDiff < 24 * 60 * 60 * 1000,
  );
  // 7. Verify new access token is different from original (token rotation)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  // 8. Verify the new token can be used (connection headers updated)
  TestValidator.predicate(
    "new access token is set in connection headers",
    refreshConnection.headers?.Authorization === refreshedAuth.token.access,
  );
}
