import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate successful token refresh for a community moderator.
 *
 * Business flow:
 *
 * 1. Register a new community moderator via POST /auth/communityModerator/join.
 *
 *    - This creates a moderator actor and an initial authenticated session.
 *    - Response: ICommunityPlatformCommunityModerator.IAuthorized including an
 *         IAuthorizationToken bundle
 *         (access/refresh/expired_at/refreshable_until).
 * 2. Extract the refresh token and original token metadata from the join response.
 * 3. Call POST /auth/communityModerator/refresh with the refresh token in an
 *    ICommunityPlatformCommunityModerator.IRefresh body.
 * 4. Assert that the refresh call succeeds and returns a valid
 *    ICommunityPlatformCommunityModerator.IAuthorized instance.
 * 5. Verify business invariants:
 *
 *    - The moderator id remains the same between original and refreshed
 *         authorization contexts.
 *    - The token bundle is rotated/renewed: at least the access token or the expiry
 *         timestamp changes.
 *    - The refreshed token fields are structurally sound (non-empty strings, valid
 *         ISO date-times as enforced by typia.assert).
 */
export async function test_api_community_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new community moderator and obtain the initial authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    // Optional profile attributes
    display_name: RandomGenerator.name(2),
    // ip is optional; omit it to let backend infer or leave null
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const originalAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    originalAuthorized,
  );

  const originalToken: IAuthorizationToken = originalAuthorized.token;
  typia.assert<IAuthorizationToken>(originalToken);

  // Sanity check: original token fields should be non-empty strings, but
  // typia.assert already guarantees type and format correctness. We only use a
  // light predicate to ensure non-empty access token.
  TestValidator.predicate(
    "original access token should be non-empty",
    originalToken.access.length > 0,
  );

  // 2. Build refresh request using the original refresh token.
  const refreshBody = {
    refreshToken: originalToken.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  // 3. Call refresh endpoint.
  const refreshedAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    refreshedAuthorized,
  );

  const refreshedToken: IAuthorizationToken = refreshedAuthorized.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  // 4. Business validations
  // 4-1. Moderator identity must be stable across refresh.
  TestValidator.equals(
    "refreshed moderator id must equal original moderator id",
    refreshedAuthorized.id,
    originalAuthorized.id,
  );

  // 4-2. Token bundle should be rotated or renewed.
  // Require at least access token or expiry to change.
  const accessChanged: boolean = refreshedToken.access !== originalToken.access;
  const expiryChanged: boolean =
    refreshedToken.expired_at !== originalToken.expired_at;

  TestValidator.predicate(
    "either access token or expired_at must change after refresh",
    accessChanged || expiryChanged,
  );

  // 4-3. New refresh token should be a non-empty string.
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshedToken.refresh.length > 0,
  );

  // 4-4. Basic temporal sanity check: a token should not be refreshable
  // earlier than its own access token expiry. This does not enforce any
  // specific policy horizon, only that refreshable_until is not before
  // expired_at in the refreshed bundle.
  const refreshedExpiredAtMs = new Date(refreshedToken.expired_at).getTime();
  const refreshedRefreshableUntilMs = new Date(
    refreshedToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshable_until should be at or after expired_at for refreshed token",
    refreshedRefreshableUntilMs >= refreshedExpiredAtMs,
  );

  // The fact that we reached this point without additional credential
  // submission and with a valid refreshedAuthorized context confirms that the
  // refreshToken alone was sufficient for renewal.
}
