import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
 * Test successful token refresh scenario where an admin authenticates with valid refresh token
 * to obtain new access and refresh tokens. Validates that refresh operation creates new tokens
 * with updated expiration while maintaining admin profile information.
 */
export async function test_api_admin_auth_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Store initial token information for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // Step 3: Refresh tokens using the refresh token - use SDK directly since utility function doesn't exist
  const refreshResponse =
    await api.functional.communityPlatform.auth.admin.refresh(adminConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPlatformAdmin.IRefresh,
    });
  typia.assert(refreshResponse);
  // Step 4: Validate that new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be renewed",
    refreshResponse.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );
  // Step 5: Validate token expiration timestamps are updated
  TestValidator.notEquals(
    "access token expiration should be updated",
    refreshResponse.token.expired_at,
    initialExpiredAt,
  );
  TestValidator.notEquals(
    "refresh token expiration should be updated",
    refreshResponse.token.refreshable_until,
    initialRefreshableUntil,
  );
  // Step 6: Validate that admin profile information remains consistent
  TestValidator.equals(
    "admin ID should remain the same",
    refreshResponse.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "admin email should remain the same",
    refreshResponse.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "admin display name should remain the same",
    refreshResponse.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "admin permissions level should remain the same",
    refreshResponse.permissions_level,
    initialAuth.permissions_level,
  );
  TestValidator.equals(
    "admin active status should remain the same",
    refreshResponse.is_active,
    initialAuth.is_active,
  );
  // Step 7: Validate token structure and expiration logic
  TestValidator.predicate(
    "access token should be non-empty string",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    refreshResponse.token.refresh.length > 0,
  );
  // Validate expiration timestamps are in the future
  const currentTime = new Date().toISOString();
  TestValidator.predicate(
    "access token expiration should be in the future",
    refreshResponse.token.expired_at > currentTime,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshResponse.token.refreshable_until > currentTime,
  );
  // Step 8: Validate that refresh operation extends session without re-authentication
  // Check if Authorization header was set by the refresh operation
  await TestValidator.predicate(
    "admin connection should have Authorization header after refresh",
    async () => {
      return (
        adminConnection.headers !== undefined &&
        adminConnection.headers.Authorization !== undefined &&
        adminConnection.headers.Authorization === refreshResponse.token.access
      );
    },
  );
}
