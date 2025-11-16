import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";

/**
 * Validate that guestUser refresh rejects clearly invalid or expired-like
 * sessions.
 *
 * ## Business intent
 *
 * This test exercises the guestUser anonymous authentication lifecycle and, in
 * particular, the behavior of the /auth/guestUser/refresh endpoint when
 * presented with a refresh token that should no longer be considered valid.
 *
 * Given the constraints of the public API surface (no direct access to
 * community_platform_guestuser_sessions or server-side clock control), we
 * approximate an "expired session" by corrupting the refresh token string in a
 * deterministic way. The backend is expected to treat this as an invalid or
 * expired refresh context and reject the request instead of issuing a new
 * ICommunityPlatformGuestuser.IAuthorized payload.
 *
 * ## Test steps
 *
 * 1. Call POST /auth/guestUser/join with a realistic
 *    ICommunityPlatformGuestuser.IJoin payload to create an initial guest actor
 *    and associated guest session.
 * 2. Assert that the response is a valid ICommunityPlatformGuestuser.IAuthorized
 *    instance whose token.refresh is a non-empty string.
 * 3. Call POST /auth/guestUser/refresh with the valid refresh token and assert
 *    that a new ICommunityPlatformGuestuser.IAuthorized payload is issued.
 * 4. Derive a clearly invalid refresh token by appending deterministic junk to the
 *    original refresh token while maintaining correct TypeScript typing.
 * 5. Call POST /auth/guestUser/refresh with this corrupted refresh token and
 *    assert that the operation fails with an HTTP client error (401/403) using
 *    TestValidator.httpError.
 *
 * The test does not attempt to validate internal session tables directly; it
 * focuses on API-observable behavior while remaining fully type-safe.
 */
export async function test_api_guest_user_refresh_rejects_expired_session(
  connection: api.IConnection,
) {
  // 1. Create an initial guest session via /auth/guestUser/join
  const joinBody = {
    anonymous_handle: RandomGenerator.alphaNumeric(16),
    user_agent: RandomGenerator.name(2),
    ip: "192.168.0.1" as string & tags.Format<"ipv4">,
    href: "https://example.com/guest/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformGuestuser.IJoin;

  const initialAuth: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(initialAuth);

  const initialToken: IAuthorizationToken = initialAuth.token;
  typia.assert(initialToken);

  TestValidator.predicate(
    "initial refresh token must be non-empty",
    initialToken.refresh.length > 0,
  );

  // 2. Perform a valid refresh with the current refresh token
  const validRefreshBody = {
    refreshToken: initialToken.refresh,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  const refreshedAuth: ICommunityPlatformGuestuser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert(refreshedAuth);
  typia.assert<IAuthorizationToken>(refreshedAuth.token);

  TestValidator.notEquals(
    "access token should rotate on successful refresh",
    refreshedAuth.token.access,
    initialToken.access,
  );

  // 3. Build a clearly invalid (corrupted) refresh token to simulate expired/invalid context
  const corruptedRefreshToken: string = `${initialToken.refresh}__invalid_suffix`;

  const invalidRefreshBody = {
    refreshToken: corruptedRefreshToken,
  } satisfies ICommunityPlatformGuestuser.IRefresh;

  // 4. Call refresh with the corrupted token and assert HTTP 401/403 error
  await TestValidator.httpError(
    "refresh with corrupted/expired-like token must be rejected",
    [401, 403],
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );
}
