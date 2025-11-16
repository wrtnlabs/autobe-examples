import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserRefresh";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate successful token refresh for a guestUser with an active session.
 *
 * Business goals:
 *
 * - Ensure that a guest identity created via /auth/guestUser/join can refresh its
 *   JWT tokens while the underlying session remains valid.
 * - Confirm that token rotation preserves guest identity continuity and exposes a
 *   valid, non-expired session in the summaries.
 *
 * Scenario steps:
 *
 * 1. Call /auth/guestUser/join to establish an initial guest identity and session,
 *    capturing token, guest, and session summaries.
 * 2. Call /auth/guestUser/refresh with the previous refresh token and updated
 *    navigation context.
 * 3. Assert that new tokens are issued, the guest identity (guest.id) is
 *    unchanged, and the session summary reflects an active, non-expired session
 *    linked to the same guest.
 */
export async function test_api_guestuser_refresh_success_with_active_session(
  connection: api.IConnection,
) {
  // 1. Establish an initial guest identity and session via join
  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "203.0.113.42",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(joined);

  const initialToken: IAuthorizationToken = joined.token;
  const initialGuest: ITodoAppGuestUser.ISummary = joined.guest;
  const initialSession: ITodoAppGuestUserSession.ISummary = joined.session;

  // 2. Prepare refresh request using the initial refresh token
  const refreshBody = {
    refresh_token: initialToken.refresh,
    ip: "203.0.113.99",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: joinBody.href,
  } satisfies ITodoAppGuestUserRefresh.IRequest;

  const refreshed: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  const refreshedGuest: ITodoAppGuestUser.ISummary = refreshed.guest;
  const refreshedSession: ITodoAppGuestUserSession.ISummary = refreshed.session;

  // 3. Validate token rotation semantics
  TestValidator.notEquals(
    "access token should be rotated on guest refresh",
    refreshedToken.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated on guest refresh",
    refreshedToken.refresh,
    initialToken.refresh,
  );

  const initialAccessExpiredAt = new Date(initialToken.expired_at).getTime();
  const refreshedAccessExpiredAt = new Date(
    refreshedToken.expired_at,
  ).getTime();
  const initialRefreshableUntil = new Date(
    initialToken.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed access token should not expire before initial access token",
    refreshedAccessExpiredAt >= initialAccessExpiredAt,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should not be earlier than initial",
    refreshedRefreshableUntil >= initialRefreshableUntil,
  );

  const now = Date.now();
  TestValidator.predicate(
    "refreshed access token expiration should be in the future",
    refreshedAccessExpiredAt > now,
  );
  TestValidator.predicate(
    "refreshed refresh token window should extend into the future",
    refreshedRefreshableUntil > now,
  );

  // 4. Validate identity continuity
  TestValidator.equals(
    "guest id must be stable across token refresh",
    refreshedGuest.id,
    initialGuest.id,
  );

  TestValidator.equals(
    "guest status must remain unchanged on refresh",
    refreshedGuest.status,
    initialGuest.status,
  );

  // 5. Validate session semantics
  TestValidator.equals(
    "session.guestUser.id must match guest.id after refresh",
    refreshedSession.guestUser.id,
    refreshedGuest.id,
  );

  const refreshedExpiredAt =
    refreshedSession.expired_at === undefined
      ? undefined
      : refreshedSession.expired_at;

  TestValidator.predicate(
    "refreshed session must be active (expired_at null or undefined)",
    refreshedExpiredAt === null || refreshedExpiredAt === undefined,
  );

  const initialSessionCreatedAt = new Date(initialSession.created_at).getTime();
  const refreshedSessionCreatedAt = new Date(
    refreshedSession.created_at,
  ).getTime();

  TestValidator.predicate(
    "refreshed session created_at should not be earlier than initial session created_at",
    refreshedSessionCreatedAt >= initialSessionCreatedAt,
  );

  TestValidator.predicate(
    "refreshed session created_at should not be in the distant future",
    refreshedSessionCreatedAt <= Date.now(),
  );
}
