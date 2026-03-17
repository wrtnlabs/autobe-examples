import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that guests can refresh their session tokens and maintain browsing continuity.
 *
 * This test validates the guest token refresh flow:
 * 1. Guest creates account via join endpoint
 * 2. Guest refreshes tokens using refresh token
 * 3. New tokens are issued (token rotation)
 * 4. Guest ID remains consistent (session continuity)
 */
export async function test_api_guest_browsing_continuity_after_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest account to establish browsing session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialAuth);
  // Store initial tokens and guest ID
  const initialGuestId = initialAuth.id;
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // Step 2: Refresh the guest session using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate refreshed tokens and session continuity
  // Guest ID should remain the same (session continuity)
  TestValidator.equals(
    "guest ID unchanged after refresh",
    refreshedAuth.id,
    initialGuestId,
  );
  // New access token should be different (token rotation for security)
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  // New refresh token should be different (refresh token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // Validate token expiration timestamps are in the future
  const now = new Date();
  const accessExpiry = new Date(refreshedAuth.token.expired_at);
  const refreshDeadline = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate("access token expires in future", accessExpiry > now);
  TestValidator.predicate(
    "refresh token valid until future",
    refreshDeadline > now,
  );
  TestValidator.predicate(
    "refresh deadline after access expiry",
    refreshDeadline > accessExpiry,
  );
  // Step 4: Verify the refreshed connection can be used for subsequent operations
  // The refreshed connection now has the new access token in headers
  TestValidator.predicate(
    "refreshed connection has authorization header",
    refreshConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches new access token",
    refreshConnection.headers?.Authorization,
    refreshedAuth.token.access,
  );
}
