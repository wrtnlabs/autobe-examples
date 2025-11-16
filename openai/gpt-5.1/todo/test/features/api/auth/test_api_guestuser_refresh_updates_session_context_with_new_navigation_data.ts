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
 * Validate that guestUser refresh updates session navigation context while
 * preserving guest identity and rotating tokens.
 *
 * Business flow:
 *
 * 1. Establish an initial guestUser identity and session via /auth/guestUser/join
 *    using ITodoAppGuestUserJoin.IRequest with realistic href/referrer.
 * 2. Capture the returned ITodoAppGuestUser.IAuthorized payload (token, guest,
 *    session).
 * 3. Simulate navigation to a new page by constructing
 *    ITodoAppGuestUserRefresh.IRequest with the same refresh_token but
 *    different href/referrer (and modified ip).
 * 4. Call /auth/guestUser/refresh and assert:
 *
 *    - Response is ITodoAppGuestUser.IAuthorized (typia.assert).
 *    - Guest.id remains unchanged across join and refresh.
 *    - Session.guestUser.id matches guest.id in the same response.
 *    - The refreshed session remains active (expired_at is null/undefined).
 *    - Navigation fields (href, referrer, ip) reflect the updated values to model
 *         latest-touch tracking semantics.
 *    - A new access token is issued (access string changes) while the refresh token
 *         may or may not rotate depending on implementation.
 */
export async function test_api_guestuser_refresh_updates_session_context_with_new_navigation_data(
  connection: api.IConnection,
) {
  // 1. Establish initial guest session via join with baseline navigation context.
  const initialHref: string & tags.Format<"uri"> =
    "https://todo-app.example.com/welcome";
  const initialReferrer: string & tags.Format<"uri"> =
    "https://landing.example.com/campaign-123";

  const joinBody = {
    href: initialHref,
    referrer: initialReferrer,
    external_reference: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "192.0.2.1",
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const joined: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const initialToken: IAuthorizationToken = joined.token;
  const initialGuest: ITodoAppGuestUser.ISummary = joined.guest;
  const initialSession: ITodoAppGuestUserSession.ISummary = joined.session;

  // Initial business sanity checks (non-type-level) on relationships.
  TestValidator.predicate(
    "initial session belongs to same guest",
    () => initialSession.guestUser.id === initialGuest.id,
  );
  TestValidator.predicate(
    "initial session is active (expired_at is null/undefined)",
    () =>
      initialSession.expired_at === null ||
      initialSession.expired_at === undefined,
  );
  TestValidator.equals(
    "initial session href should match join request href",
    initialSession.href,
    joinBody.href,
  );
  TestValidator.equals(
    "initial session referrer should match join request referrer",
    initialSession.referrer,
    joinBody.referrer,
  );

  // 2. Simulate navigation to a new page and build refresh request.
  const refreshedHref: string & tags.Format<"uri"> =
    "https://todo-app.example.com/boards/active";
  const refreshedReferrer: string & tags.Format<"uri"> =
    "https://todo-app.example.com/welcome";

  const refreshBody = {
    refresh_token: initialToken.refresh,
    href: refreshedHref,
    referrer: refreshedReferrer,
    ip: "198.51.100.42",
  } satisfies ITodoAppGuestUserRefresh.IRequest;

  // 3. Call refresh endpoint with updated navigation context.
  const refreshed: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  const refreshedGuest: ITodoAppGuestUser.ISummary = refreshed.guest;
  const refreshedSession: ITodoAppGuestUserSession.ISummary = refreshed.session;

  // 4. Assert guest identity continuity.
  TestValidator.equals(
    "guest id must remain stable across join and refresh",
    refreshedGuest.id,
    initialGuest.id,
  );
  TestValidator.equals(
    "refreshed session must reference same guest id",
    refreshedSession.guestUser.id,
    refreshedGuest.id,
  );

  // 5. Assert navigation context reflects latest refresh payload.
  TestValidator.equals(
    "refreshed session href should reflect new navigation href",
    refreshedSession.href,
    refreshBody.href,
  );
  TestValidator.equals(
    "refreshed session referrer should reflect new navigation referrer",
    refreshedSession.referrer,
    refreshBody.referrer,
  );
  TestValidator.equals(
    "refreshed session ip should reflect new ip when provided",
    refreshedSession.ip,
    refreshBody.ip,
  );

  // 6. Assert session remains active after refresh.
  TestValidator.predicate(
    "refreshed session is still active (expired_at null/undefined)",
    () =>
      refreshedSession.expired_at === null ||
      refreshedSession.expired_at === undefined,
  );

  // 7. Basic lifecycle sanity: refreshed session should not be older than original.
  TestValidator.predicate(
    "refreshed session created_at must be >= initial session created_at",
    () => refreshedSession.created_at >= initialSession.created_at,
  );

  // 8. Token rotation behavior: expect a new access token while preserving refresh semantics.
  TestValidator.notEquals(
    "access token should rotate on refresh to represent new session context",
    refreshedToken.access,
    initialToken.access,
  );
}
