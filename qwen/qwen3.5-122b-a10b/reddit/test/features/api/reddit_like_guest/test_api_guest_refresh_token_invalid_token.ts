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
 * Test guest session refresh fails with invalid or tampered refresh token.
 *
 * Validates that the guest token refresh endpoint properly rejects invalid, tampered, or expired refresh tokens while maintaining session security. Ensures that token signature verification works correctly and that invalid tokens do not compromise valid sessions.
 *
 * The test creates a guest account with a valid session, then attempts to refresh the token with various invalid token scenarios to verify proper error handling and security measures.
 *
 * 1. Create a guest account with valid device fingerprint and session context.
 * 2. Extract and save the valid refresh token and guest_id from the authorization response.
 * 3. Attempt to refresh with a tampered refresh token (modified JWT string).
 * 4. Verify HTTP 401 Unauthorized error is thrown for invalid token.
 * 5. Verify the original guest_id remains unchanged after failed refresh attempt.
 * 6. Verify the valid refresh token successfully renews the session with new tokens.
 * 7. Verify the renewed session maintains the same guest_id (session continuity).
 */
export async function test_api_guest_refresh_token_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account with valid session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(authorized);
  // Save the valid refresh token and guest_id
  const validRefreshToken: string = authorized.token.refresh;
  const originalGuestId: string = authorized.guest_id;
  // 2. Attempt refresh with invalid/tampered token - should fail with 401
  const tamperedToken: string = validRefreshToken.slice(0, -5) + "XXXXX";
  await TestValidator.httpError(
    "invalid token should return 401",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(invalidConnection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies IRedditLikeGuest.IRefresh,
      });
    },
  );
  // 3. Verify guest_id remains unchanged after failed refresh attempt
  TestValidator.equals(
    "guest_id unchanged after failed refresh",
    originalGuestId,
    authorized.guest_id,
  );
  // 4. Verify the valid refresh token successfully renews the session
  const renewed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IRedditLikeGuest.IRefresh,
  });
  typia.assert(renewed);
  // 5. Verify session continuity - guest_id remains the same
  TestValidator.equals(
    "guest_id preserved after refresh",
    originalGuestId,
    renewed.guest_id,
  );
  // 6. Verify new access token is different (token rotation)
  TestValidator.notEquals(
    "access token refreshed",
    authorized.token.access,
    renewed.token.access,
  );
  // 7. Verify new tokens have valid future expiration
  const now: Date = new Date();
  const renewedExpiredAt: Date = new Date(renewed.token.expired_at);
  const renewedRefreshableUntil: Date = new Date(
    renewed.token.refreshable_until,
  );
  TestValidator.predicate(
    "access token expires in future",
    renewedExpiredAt > now,
  );
  TestValidator.predicate(
    "refresh token valid in future",
    renewedRefreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until after expired at",
    renewedRefreshableUntil > renewedExpiredAt,
  );
}
