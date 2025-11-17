import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * This E2E test function validates the entire lifecycle of a guest user's
 * refresh token in the redditCommunity platform. It starts by creating a new
 * guest user via the join API endpoint, capturing the initial authorization
 * token and user details. The test then uses the refresh token provided to call
 * the refresh endpoint to obtain new access and refresh tokens. It verifies
 * that the refresh operation successfully issues new tokens, preserves the
 * guest user identity and session continuity, and updates token expiration
 * timestamps. The test checks that the tokens are strings and that the user ID
 * remains consistent before and after refresh. This ensures the correctness and
 * security of the guest token refresh mechanism, crucial for maintaining
 * seamless guest user sessions.
 */
export async function test_api_guest_refresh_token_lifecycle(
  connection: api.IConnection,
) {
  // 1. Create a new guest user account
  const joinBody = {
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityGuest.IJoin;

  const guestUser: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: joinBody,
    });
  typia.assert(guestUser);

  // 2. Validate initial authorization tokens
  const initialToken = guestUser.token;
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof initialToken.access === "string" && initialToken.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof initialToken.refresh === "string" && initialToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is a valid ISO date",
    !isNaN(Date.parse(initialToken.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is a valid ISO date",
    !isNaN(Date.parse(initialToken.refreshable_until)),
  );

  // 3. Use the refresh token to obtain new tokens
  const refreshBody = {
    refresh_token: initialToken.refresh,
  } satisfies IRedditCommunityGuest.IRefresh;

  const refreshedUser: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedUser);

  // 4. Validate refreshed authorization tokens
  const refreshedToken = refreshedUser.token;
  TestValidator.predicate(
    "refreshed access token is a non-empty string",
    typeof refreshedToken.access === "string" &&
      refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is a non-empty string",
    typeof refreshedToken.refresh === "string" &&
      refreshedToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is a valid ISO date",
    !isNaN(Date.parse(refreshedToken.expired_at)),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is a valid ISO date",
    !isNaN(Date.parse(refreshedToken.refreshable_until)),
  );

  // 5. Confirm user identity and session consistency
  TestValidator.equals("user id is unchanged", refreshedUser.id, guestUser.id);
  TestValidator.equals(
    "session id is unchanged",
    refreshedUser.session_id,
    guestUser.session_id,
  );
  TestValidator.equals("href is unchanged", refreshedUser.href, guestUser.href);
  TestValidator.equals(
    "referrer is unchanged",
    refreshedUser.referrer,
    guestUser.referrer,
  );

  // 6. Confirm that refreshed tokens differ from initial tokens
  TestValidator.notEquals(
    "access token should be new",
    refreshedToken.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be new",
    refreshedToken.refresh,
    initialToken.refresh,
  );
  TestValidator.notEquals(
    "expired_at should be updated",
    refreshedToken.expired_at,
    initialToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until should be updated",
    refreshedToken.refreshable_until,
    initialToken.refreshable_until,
  );
}
