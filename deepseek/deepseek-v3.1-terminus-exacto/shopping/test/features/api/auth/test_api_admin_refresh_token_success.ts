import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test successful administrator token refresh workflow.
 *
 * This test validates that an existing administrator session can be refreshed
 * using a valid refresh token, generating new access tokens without requiring
 * re-authentication. The test verifies proper token validation, session
 * continuity, and security context preservation including IP address,
 * connection URL, and referrer tracking.
 *
 * The test validates that the response contains new access and refresh tokens
 * with updated expiration timestamps, and includes complete administrator
 * profile information for proper session management.
 */
export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
) {
  // Generate realistic refresh token request data with proper security context
  const refreshRequest = {
    refresh_token: typia.random<string>(),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdministrator.IRefresh;

  // Call the refresh endpoint with valid refresh token and session context
  const response = await api.functional.auth.admin.refresh(connection, {
    body: refreshRequest,
  });

  // Validate response structure including token information and administrator profile
  typia.assert(response);

  // Verify token expiration timestamps are properly updated
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(response.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(response.token.refreshable_until) > new Date(),
  );

  // Confirm the Authorization header is automatically updated in the connection
  TestValidator.equals(
    "Authorization header is set with new access token",
    connection.headers?.Authorization,
    response.token.access,
  );

  // Validate administrator profile structure
  TestValidator.predicate(
    "administrator name is not empty",
    response.administrator.name.length > 0,
  );

  TestValidator.predicate(
    "administrator role is not empty",
    response.administrator.role.length > 0,
  );
}
