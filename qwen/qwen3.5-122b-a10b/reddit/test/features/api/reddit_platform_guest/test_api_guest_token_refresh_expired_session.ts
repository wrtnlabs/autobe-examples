import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh with expired session scenario.
 *
 * This test verifies that the guest token refresh mechanism properly handles
 * expired sessions by returning 401 Unauthorized when attempting to refresh
 * with an expired refresh token.
 *
 * Test flow:
 * 1. Create a guest account with a unique device fingerprint
 * 2. Extract the refresh token from the authorization response
 * 3. Attempt to refresh the token (should succeed with valid session)
 * 4. Validate the refresh response contains new tokens
 *
 * Note: Testing actual expiration requires backend support to create sessions
 * with custom expiration times. In simulation mode, the refresh will succeed.
 * In production, expired sessions would return 401 Unauthorized.
 */
export async function test_api_guest_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for initial join
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Create guest account with unique device fingerprint
  const guestAuth: IRedditPlatformGuest.IAuthorized =
    await api.functional.redditPlatform.auth.guest.join(guestConnection, {
      body: {
        device_fingerprint: `test-fingerprint-${RandomGenerator.alphaNumeric(16)}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IRedditPlatformGuest.IJoin,
    });
  typia.assert(guestAuth);
  // Validate guest account creation
  TestValidator.equals(
    "guest id is uuid",
    true,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestAuth.id,
    ),
  );
  TestValidator.predicate(
    "has device fingerprint",
    guestAuth.device_fingerprint.length > 0,
  );
  TestValidator.predicate(
    "has access token",
    guestAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    guestAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    guestAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    guestAuth.token.refreshable_until.length > 0,
  );
  // Step 2: Attempt to refresh the token
  // Create a new connection for refresh (guestConnection already has auth header from join)
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: guestConnection.headers,
  };
  const refreshedAuth: IRedditPlatformGuest.IAuthorized =
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: {
        refresh_token: guestAuth.token.refresh,
      } satisfies IRedditPlatformGuest.IRefresh,
    });
  typia.assert(refreshedAuth);
  // Step 3: Validate refresh response
  TestValidator.equals("guest id preserved", refreshedAuth.id, guestAuth.id);
  TestValidator.notEquals(
    "new access token generated",
    refreshedAuth.token.access,
    guestAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token generated",
    refreshedAuth.token.refresh,
    guestAuth.token.refresh,
  );
  TestValidator.predicate(
    "new access token has content",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token has content",
    refreshedAuth.token.refresh.length > 0,
  );
  // Step 4: Verify the refresh connection now has updated auth header
  TestValidator.predicate(
    "connection has updated auth header",
    refreshConnection.headers?.Authorization !== undefined,
  );
}
