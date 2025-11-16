import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminRefresh";

/**
 * Validate successful JWT token refresh for a platform administrator.
 *
 * Business goal:
 *
 * - Ensure that a platform admin who has already joined (and thus has an
 *   authorized session with access + refresh tokens) can call the refresh
 *   endpoint to obtain a new authorized session without re-entering
 *   credentials.
 * - Confirm that refresh preserves the administrator identity while rotating
 *   access token (and its expiry) as part of session renewal.
 *
 * Scenario steps:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join.
 * 2. Capture the initial IShoppingMallPlatformAdmin.IAuthorized response and
 *    extract its IAuthorizationToken.
 * 3. Call POST /auth/platformAdmin/refresh with the refresh token and client
 *    context (ip, userAgent, correlationId).
 * 4. Validate that identity fields remain the same while access token (and its
 *    expiry) change, proving a proper refresh.
 */
export async function test_api_platform_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to obtain initial authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    // explicitly set optional ip to exercise nullable field
    ip: "203.0.113.10",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const initialAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(initialAdmin);

  const initialToken: IAuthorizationToken = initialAdmin.token;

  // 2. Call refresh endpoint with refresh token and client context
  const refreshRequest = {
    refreshToken: initialToken.refresh,
    ip: "203.0.113.20",
    userAgent: "Mozilla/5.0 (E2E Test PlatformAdminRefresh)",
    correlationId: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallPlatformAdminRefresh.IRequest;

  const refreshedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshedAdmin);

  const refreshedToken: IAuthorizationToken = refreshedAdmin.token;

  // 3. Identity consistency assertions
  TestValidator.equals(
    "platform admin id remains the same after token refresh",
    refreshedAdmin.id,
    initialAdmin.id,
  );
  TestValidator.equals(
    "platform admin email remains the same after token refresh",
    refreshedAdmin.email,
    initialAdmin.email,
  );
  TestValidator.equals(
    "platform admin displayName remains the same after token refresh",
    refreshedAdmin.displayName,
    initialAdmin.displayName,
  );

  TestValidator.equals(
    "platform admin active flag remains true after token refresh",
    refreshedAdmin.isActive,
    initialAdmin.isActive,
  );

  // 4. Token rotation assertions
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedToken.access,
    initialToken.access,
  );

  TestValidator.notEquals(
    "access token expiry should be updated on refresh",
    refreshedToken.expired_at,
    initialToken.expired_at,
  );
}
