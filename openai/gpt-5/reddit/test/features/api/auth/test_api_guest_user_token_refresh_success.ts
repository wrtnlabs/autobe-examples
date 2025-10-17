import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";

/**
 * Guest user token refresh succeeds and preserves identity while rotating
 * tokens.
 *
 * Purpose
 *
 * - Ensure that a guest session created by POST /auth/guestUser/join can be
 *   refreshed by POST /auth/guestUser/refresh using the previously issued
 *   refresh token.
 *
 * What this validates
 *
 * 1. Initial guest join returns an authorized payload following
 *    ICommunityPlatformGuestUser.IAuthorized
 * 2. Refresh succeeds with body satisfying ICommunityPlatformGuestUser.IRefresh
 * 3. Subject consistency: user id remains the same after refresh
 * 4. Token rotation rules:
 *
 *    - Access token is rotated (changed)
 *    - Refresh token may or may not rotate depending on provider policy; test
 *         tolerates both behaviors while documenting outcome
 * 5. Optional role field, when present, equals "guestUser"
 *
 * Notes
 *
 * - The SDK automatically manages Authorization headers. This test never touches
 *   connection.headers directly.
 */
export async function test_api_guest_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1) Prepare a unique guest registration input
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformGuestUser.IJoin;

  // 2) Create initial guest session
  const joined: ICommunityPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic invariants on optional role
  if (joined.role !== undefined)
    TestValidator.equals(
      "joined role equals 'guestUser' when present",
      joined.role,
      "guestUser",
    );

  // 3) Request refresh using captured refresh token
  const refreshBody = {
    refresh_token: joined.token.refresh,
  } satisfies ICommunityPlatformGuestUser.IRefresh;

  const refreshed: ICommunityPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Optional role check after refresh
  if (refreshed.role !== undefined)
    TestValidator.equals(
      "refreshed role equals 'guestUser' when present",
      refreshed.role,
      "guestUser",
    );

  // 4) Subject consistency (same user id)
  TestValidator.equals(
    "user id remains the same after refresh",
    refreshed.id,
    joined.id,
  );

  // 5) Access token rotation: new access token must differ
  TestValidator.notEquals(
    "access token must rotate on refresh",
    refreshed.token.access,
    joined.token.access,
  );

  // 6) Refresh token rotation policy: tolerate both rotated and stable cases
  if (refreshed.token.refresh !== joined.token.refresh)
    TestValidator.notEquals(
      "refresh token rotated (provider policy)",
      refreshed.token.refresh,
      joined.token.refresh,
    );
  else
    TestValidator.equals(
      "refresh token remained the same (provider policy)",
      refreshed.token.refresh,
      joined.token.refresh,
    );
}
