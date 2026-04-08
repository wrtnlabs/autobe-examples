import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
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
 * Validates the complete guest refresh workflow including initial guest account creation,
 * session token acquisition, and token refresh. Ensures that the refresh operation
 * correctly returns new JWT tokens, extends the session expiration time, and maintains
 * guest identity consistency across the refresh operation.
 *
 * Special attention is given to verifying that token rotation occurs (new tokens
 * differ from original), session extension happens (expired_at is updated), and
 * guest identity (id, email, device fingerprint) remains unchanged.
 *
 * 1. Administrator creates guest account with unique email and password.
 * 2. Receive IAuthorized response with access token, refresh token, and expiration timestamps.
 * 3. Capture the refresh_token and session identity from the join response.
 * 4. Wait for a brief period to ensure token has aged before refresh.
 * 5. Submit POST request to /redditCommunity/auth/guest/refresh with the refresh_token in request body.
 * 6. Verify the response contains renewed IAuthorized with new JWT tokens.
 * 7. Validate that guest identity remains unchanged across refresh.
 * 8. Validate token rotation - new access and refresh tokens differ from originals.
 * 9. Validate session extension - new expired_at is later than original.
 * 10. Validate refreshable_until is properly set and extended.
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and get initial session tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Capture refresh token and session info from join response
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalExpiredAt = joinResponse.token.expired_at;
  const originalRefreshableUntil = joinResponse.token.refreshable_until;
  const guestId = joinResponse.id;
  const guestEmail = joinResponse.email;
  const deviceFingerprint = joinResponse.device_fingerprint;
  const createdDate = joinResponse.created_at;
  // 3. Wait briefly to ensure token has aged before refresh
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 4. Submit refresh request with the original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCommunityGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Validate guest identity remains unchanged
  TestValidator.equals("guest id unchanged", refreshResponse.id, guestId);
  TestValidator.equals(
    "guest email unchanged",
    refreshResponse.email,
    guestEmail,
  );
  TestValidator.equals(
    "device fingerprint unchanged",
    refreshResponse.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals(
    "created_at unchanged",
    refreshResponse.created_at,
    createdDate,
  );
  // 6. Validate token rotation: new tokens differ from original
  TestValidator.notEquals(
    "new access token differs",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 7. Validate session extension: new expired_at is later than original
  const originalExpiredDate = new Date(originalExpiredAt);
  const newExpiredDate = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "new expired_at is later than original",
    newExpiredDate > originalExpiredDate,
  );
  // 8. Validate refreshable_until is properly set and extended
  const newRefreshableUntilDate = new Date(
    refreshResponse.token.refreshable_until,
  );
  const originalRefreshableUntilDate = new Date(originalRefreshableUntil);
  TestValidator.predicate(
    "refreshable_until is set",
    refreshResponse.token.refreshable_until !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until extends session lifetime",
    newRefreshableUntilDate > originalRefreshableUntilDate,
  );
  TestValidator.predicate(
    "refreshable_until is >= new expired_at",
    newRefreshableUntilDate >= newExpiredDate,
  );
  // 9. Validate updated_at changed (session was refreshed)
  const newUpdatedDate = new Date(refreshResponse.updated_at);
  TestValidator.predicate(
    "updated_at changed after refresh",
    newUpdatedDate > new Date(createdDate),
  );
}
