import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminRefresh";

/**
 * Validate platform admin token refresh behavior using a previously issued
 * refresh token.
 *
 * Business context:
 *
 * - Platform admins are created through /auth/platformAdmin/join, which issues an
 *   initial IAuthorizationToken pair embedded in
 *   IShoppingMallPlatformAdmin.IAuthorized.
 * - The /auth/platformAdmin/refresh endpoint is then used to rotate JWT tokens
 *   using a refresh token while respecting the current admin credential and
 *   risk state.
 *
 * What this test validates (within available SDK capabilities):
 *
 * 1. A platform admin can be joined successfully and an authorized session with a
 *    valid token pair is returned.
 * 2. The refresh endpoint accepts a refresh token from that session and returns a
 *    new IShoppingMallPlatformAdmin.IAuthorized structure.
 * 3. The refreshToken sent in the request is exactly the token obtained from the
 *    prior response, and rotating tokens preserves admin identity while issuing
 *    a different access token.
 * 4. Optional context fields (ip, userAgent, correlationId) on
 *    IShoppingMallPlatformAdminRefresh.IRequest are accepted without breaking
 *    the flow.
 *
 * Original scenario mentioned rejection after credentials/risk revocation and
 * audit log checks, but the current SDK exposes no endpoints to toggle admin
 * status or inspect auth logs. Therefore, this test focuses on the positive
 * flow and type-safe wiring of join + refresh instead of negative-path risk
 * blocking.
 */
export async function test_api_platform_admin_token_refresh_after_credentials_revoked(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin to obtain initial authorized session and tokens.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  TestValidator.predicate(
    "joined platform admin should be active",
    joined.isActive === true,
  );

  const initialToken: IAuthorizationToken = joined.token;
  typia.assert(initialToken);

  // 2. Perform a first refresh using the initial refresh token to confirm basic flow.
  const firstRefreshBody = {
    refreshToken: initialToken.refresh,
    ip: "203.0.113.10",
    userAgent: "e2e-test-agent/1.0",
    correlationId: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallPlatformAdminRefresh.IRequest;

  const refreshedOnce: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(refreshedOnce);

  TestValidator.predicate(
    "refreshed platform admin should stay active",
    refreshedOnce.isActive === true,
  );

  TestValidator.equals(
    "admin id should be preserved across refresh",
    refreshedOnce.id,
    joined.id,
  );

  const refreshedToken: IAuthorizationToken = refreshedOnce.token;
  typia.assert(refreshedToken);

  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedToken.access,
    initialToken.access,
  );

  // 3. Call refresh again with the latest refresh token to validate repeatable rotation.
  const secondRefreshBody = {
    refreshToken: refreshedToken.refresh,
    ip: "203.0.113.11",
    userAgent: "e2e-test-agent/1.0",
    correlationId: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallPlatformAdminRefresh.IRequest;

  const refreshedTwice: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(refreshedTwice);

  TestValidator.predicate(
    "platform admin should remain active after second refresh",
    refreshedTwice.isActive === true,
  );

  TestValidator.equals(
    "admin id should remain stable after multiple refreshes",
    refreshedTwice.id,
    joined.id,
  );

  const refreshedTwiceToken: IAuthorizationToken = refreshedTwice.token;
  typia.assert(refreshedTwiceToken);

  TestValidator.notEquals(
    "access token should change between first and second refresh",
    refreshedTwiceToken.access,
    refreshedToken.access,
  );
}
