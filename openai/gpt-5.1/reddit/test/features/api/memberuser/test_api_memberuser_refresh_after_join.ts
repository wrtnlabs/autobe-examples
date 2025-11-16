import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a newly registered memberUser can immediately refresh their
 * authentication tokens.
 *
 * Business flow:
 *
 * 1. Register (join) a new memberUser, which creates an initial session and token
 *    bundle.
 * 2. Immediately call the refresh endpoint using the issued refresh token.
 * 3. Confirm that account identity and status flags remain unchanged while the
 *    token bundle is rotated and its expirations move forward.
 */
export async function test_api_memberuser_refresh_after_join(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser (join)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional; let backend derive it
    href: "https://app.example.com/auth/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const originalToken: IAuthorizationToken = joined.token;
  typia.assert(originalToken);

  const oldAccess: string = originalToken.access;
  const oldRefresh: string = originalToken.refresh;
  const oldExpiredAt: string = originalToken.expired_at;
  const oldRefreshableUntil: string = originalToken.refreshable_until;

  // 2. Build refresh payload using the previous refresh token
  const refreshBody = {
    refreshToken: oldRefresh,
    // Simulate a subsequent page visit
    href: "https://app.example.com/dashboard",
    referrer: "https://app.example.com/auth/callback",
    // ip remains optional; omit to let server infer
  } satisfies ICommunityPlatformMemberuser.IRefresh;

  const refreshed: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert(refreshedToken);

  // 3. Identity invariants: core account identity and status flags must match
  TestValidator.equals(
    "member id must remain the same after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "username must remain the same after refresh",
    refreshed.username,
    joined.username,
  );
  TestValidator.equals(
    "email must remain the same after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "is_email_verified must remain unchanged after refresh",
    refreshed.is_email_verified,
    joined.is_email_verified,
  );
  TestValidator.equals(
    "is_suspended must remain unchanged after refresh",
    refreshed.is_suspended,
    joined.is_suspended,
  );
  TestValidator.equals(
    "is_banned must remain unchanged after refresh",
    refreshed.is_banned,
    joined.is_banned,
  );
  TestValidator.equals(
    "failed_login_count must remain unchanged after refresh",
    refreshed.failed_login_count,
    joined.failed_login_count,
  );
  TestValidator.equals(
    "locked_until must remain unchanged after refresh",
    refreshed.locked_until ?? null,
    joined.locked_until ?? null,
  );
  TestValidator.equals(
    "created_at must remain unchanged after refresh",
    refreshed.created_at,
    joined.created_at,
  );
  // updated_at should not move backward; allow equal or later
  TestValidator.predicate(
    "updated_at on refreshed account must be >= joined.updated_at",
    refreshed.updated_at >= joined.updated_at,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged after refresh",
    refreshed.deleted_at ?? null,
    joined.deleted_at ?? null,
  );

  // 4. Token bundle rotation and progression
  TestValidator.notEquals(
    "access token must be rotated on refresh",
    refreshedToken.access,
    oldAccess,
  );
  TestValidator.notEquals(
    "refresh token must be rotated on refresh",
    refreshedToken.refresh,
    oldRefresh,
  );

  TestValidator.predicate(
    "access token expiration should be the same or later after refresh",
    refreshedToken.expired_at >= oldExpiredAt,
  );
  TestValidator.predicate(
    "refreshable_until should be the same or later after refresh",
    refreshedToken.refreshable_until >= oldRefreshableUntil,
  );
}
