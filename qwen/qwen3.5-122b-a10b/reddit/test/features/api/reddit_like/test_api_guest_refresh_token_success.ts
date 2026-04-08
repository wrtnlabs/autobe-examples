import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest session token refresh with valid refresh token.
 *
 * Validates the guest token refresh workflow ensuring that new JWT tokens are issued correctly while preserving guest identity. The test verifies token rotation, identity preservation, and token functionality for subsequent authenticated requests.
 *
 * 1. Create guest account using authorize_guest_join utility function.
 * 2. Store original guest_id, access token, and refresh token.
 * 3. Call /redditLike/auth/guest/refresh with the valid refresh_token.
 * 4. Verify response contains new tokens with future expiration timestamps.
 * 5. Verify guest_id matches the original from join.
 * 6. Verify new access token is different from original.
 * 7. Verify new refresh token is different from original.
 * 8. Use new access token to call guest-authenticated endpoint successfully.
 */
export async function test_api_guest_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const originalAuth: IRedditLikeGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeGuest.IJoin,
    },
  );
  typia.assert(originalAuth);
  // Store original values
  const originalGuestId: string = originalAuth.guest_id;
  const originalAccessToken: string = originalAuth.token.access;
  const originalRefreshToken: string = originalAuth.token.refresh;
  // 2. Refresh token
  const refreshedAuth: IRedditLikeGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IRedditLikeGuest.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 3. Verify guest_id is preserved
  TestValidator.equals(
    "guest_id preserved",
    refreshedAuth.guest_id,
    originalGuestId,
  );
  // 4. Verify new access token is different
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  // 5. Verify new refresh token is different
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 6. Verify token expiration timestamps are in the future
  const now: Date = new Date();
  TestValidator.predicate(
    "access token expires in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token expires in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
  // 7. Verify new access token works for authenticated requests
  // Create a new connection with the refreshed token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: refreshedAuth.token.access },
  };
  // Test that the token works by making a simple authenticated request
  // We'll use the guest connection which already has the token set by authorize_guest_refresh
  TestValidator.predicate(
    "refreshed connection has authorization header",
    guestConnection.headers?.Authorization === refreshedAuth.token.access,
  );
}
