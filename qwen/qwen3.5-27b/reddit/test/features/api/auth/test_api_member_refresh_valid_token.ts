import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can successfully refresh their authentication tokens using a valid refresh token.
 *
 * Validates the complete token refresh workflow for authenticated members. After initial registration, the test extracts the refresh token and uses it to obtain new access and refresh tokens without re-authentication. Ensures that token rotation occurs correctly and expiration timestamps are properly extended.
 *
 * Special attention is given to verifying that both tokens are rotated (new values generated) and that the session remains valid with updated expiration times.
 *
 * 1. Register a new member account with email, password, and username.
 * 2. Extract the refresh token from the initial authentication response.
 * 3. Create a new connection for the refresh operation.
 * 4. Call the refresh endpoint with the valid refresh token.
 * 5. Verify new access token is different from the original.
 * 6. Verify new refresh token is different from the original.
 * 7. Verify expiration timestamps are valid and in the future.
 */
export async function test_api_member_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Call the refresh endpoint with the valid refresh token
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCloneMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Verify new access token is different from the original
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  // 5. Verify new refresh token is different from the original
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 6. Verify expiration timestamps are valid and in the future
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "access token expired_at is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in the future",
    refreshableUntil > now,
  );
  // 7. Verify refreshable_until is after expired_at (session extends beyond access token)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
