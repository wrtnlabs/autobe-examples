import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import type { ICommunityPlatformCommunityModeratorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorRefresh";

/**
 * Validate community moderator token refresh with a valid refresh token.
 *
 * Steps
 *
 * 1. Register a new community moderator user via join to get initial tokens.
 * 2. Call refresh using the returned refresh token.
 * 3. Validate refreshed payload: same user id, rotated access token, and refresh
 *    token either rotated or unchanged per policy.
 * 4. When role is present, it must equal "communityModerator".
 *
 * Notes
 *
 * - Use exact DTO variants: ICommunityPlatformCommunityModeratorJoin.ICreate for
 *   join, ICommunityPlatformCommunityModeratorRefresh.IRequest for refresh.
 * - Never touch connection.headers; SDK manages Authorization automatically.
 * - Use typia.assert for response validation and TestValidator for business
 *   assertions.
 */
export async function test_api_community_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  // 1) Register a brand-new community moderator to obtain initial tokens
  const username: string = RandomGenerator.alphaNumeric(12); // matches ^[A-Za-z0-9_]{3,20}$
  const digit: string = RandomGenerator.pick([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ] as const);
  const password: string = `${RandomGenerator.alphabets(7)}${digit}${RandomGenerator.alphabets(2)}`; // ensures >=1 digit and letters, length >= 10
  const nowIso: string = new Date().toISOString();

  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  const initial: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(initial);

  // Optional role assertion when present
  if (initial.role !== undefined)
    TestValidator.equals(
      "initial role is communityModerator when present",
      initial.role,
      "communityModerator",
    );

  // Basic token sanity
  TestValidator.predicate(
    "initial access token present",
    initial.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token present",
    initial.token.refresh.length > 0,
  );

  // 2) Refresh using the refresh token
  const refreshBody = {
    refresh_token: initial.token.refresh,
  } satisfies ICommunityPlatformCommunityModeratorRefresh.IRequest;

  const refreshed: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Optional role assertion when present
  if (refreshed.role !== undefined)
    TestValidator.equals(
      "refreshed role is communityModerator when present",
      refreshed.role,
      "communityModerator",
    );

  // 3) Business validations
  // Same user id before/after
  TestValidator.equals(
    "user id must remain the same after refresh",
    refreshed.id,
    initial.id,
  );

  // Access token should rotate
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshed.token.access,
    initial.token.access,
  );

  // Refresh token may rotate or remain (policy-dependent)
  if (refreshed.token.refresh !== initial.token.refresh)
    TestValidator.notEquals(
      "refresh token rotated as per policy",
      refreshed.token.refresh,
      initial.token.refresh,
    );
  else
    TestValidator.equals(
      "refresh token remained the same as per policy",
      refreshed.token.refresh,
      initial.token.refresh,
    );

  // Token string presence after refresh
  TestValidator.predicate(
    "refreshed access token present",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token present",
    refreshed.token.refresh.length > 0,
  );
}
