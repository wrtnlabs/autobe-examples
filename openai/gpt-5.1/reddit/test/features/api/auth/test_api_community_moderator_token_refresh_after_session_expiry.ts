import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate community moderator token refresh behavior and token rotation.
 *
 * Business context:
 *
 * - Community moderators authenticate via JWT token bundles containing access and
 *   refresh tokens.
 * - The join endpoint provisions a moderator account, creates an initial session,
 *   and returns an authorized context with a token bundle.
 * - The refresh endpoint accepts a refreshToken and, when valid and associated
 *   with an active session, issues a new token bundle and wires the access
 *   token into the connection's Authorization header.
 *
 * Original scenario asked to assert failure after DB-level session expiry, but
 * this E2E environment exposes only HTTP APIs without direct session table
 * manipulation. Therefore this test focuses on the implementable parts: the
 * happy-path refresh flow and observable token rotation invariants.
 *
 * Test steps:
 *
 * 1. Register a new community moderator using /auth/communityModerator/join.
 *
 *    - Use realistic random data for username/email/password and URLs.
 *    - Capture the returned IAuthorized structure and its token bundle.
 * 2. Immediately call /auth/communityModerator/refresh with the original
 *    refreshToken from the join response.
 * 3. Assert that the response is a valid IAuthorized structure via typia.assert.
 * 4. Business validations:
 *
 *    - Moderator id remains the same between original and refreshed context.
 *    - New access token is a non-empty string.
 *    - Access token string differs from the original token.access to indicate a
 *         rotation (best-effort external check).
 *    - New refresh token is also a non-empty string (equality with original refresh
 *         is implementation-dependent, so we do not require difference).
 */
export async function test_api_community_moderator_token_refresh_after_session_expiry(
  connection: api.IConnection,
) {
  // 1. Register a new community moderator to obtain an initial token bundle
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const joined: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(joined);

  const originalToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(originalToken);

  // Ensure basic properties on the original token
  TestValidator.predicate(
    "original access token should be non-empty",
    originalToken.access.length > 0,
  );
  TestValidator.predicate(
    "original refresh token should be non-empty",
    originalToken.refresh.length > 0,
  );

  // 2. Refresh tokens using the original refresh token
  const refreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  const refreshed: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // 3. Business validations
  // Moderator id must remain the same
  TestValidator.equals(
    "moderator id should stay consistent after refresh",
    refreshed.id,
    joined.id,
  );

  // Access token must be non-empty and ideally rotated
  TestValidator.predicate(
    "refreshed access token should be non-empty",
    refreshedToken.access.length > 0,
  );

  // Best-effort check that access token has rotated
  TestValidator.notEquals(
    "access token should be rotated on refresh (different string)",
    refreshedToken.access,
    originalToken.access,
  );

  // Refresh token must be non-empty; rotation behavior is implementation-specific
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshedToken.refresh.length > 0,
  );
}
