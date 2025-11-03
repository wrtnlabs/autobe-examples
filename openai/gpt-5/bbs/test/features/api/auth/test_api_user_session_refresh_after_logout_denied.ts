import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserSession";

/**
 * Deny refresh after logout (expired session semantics).
 *
 * This test ensures a refresh attempt fails once the member logs out and the
 * server marks the session as expired (civic_board_user_sessions.expired_at).
 *
 * Steps:
 *
 * 1. Join as a new member to obtain access + refresh artifacts (active session).
 * 2. Call logout to terminate the current session (expired_at is set).
 * 3. Attempt refresh with the previously issued refresh_token and expect an error.
 *
 * Validations:
 *
 * - All successful responses are type-asserted with typia.assert().
 * - Logout summary belongs to the joined user.
 * - Logout marks the session expired (expired_at is not null/undefined).
 * - Refresh after logout throws (no token issuance for expired session).
 */
export async function test_api_user_session_refresh_after_logout_denied(
  connection: api.IConnection,
) {
  // 1) Join: create a new member and obtain tokens bound to an active session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(1),
    ip: null,
    href: typia.random<
      string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<80000>
    >(),
    referrer: typia.random<
      string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<80000>
    >(),
  } satisfies ICivicBoardUser.ICreate;
  const authorized: ICivicBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorized);

  const refreshToken: string = authorized.token.refresh;

  // 2) Logout: terminate the current session
  const sessionSummary: ICivicBoardUserSession.ISummary =
    await api.functional.auth.user.logout(connection);
  typia.assert(sessionSummary);

  // Business validations on logout
  TestValidator.equals(
    "logout summary belongs to joined user",
    sessionSummary.user.id,
    authorized.id,
  );
  TestValidator.predicate(
    "session is marked expired after logout",
    sessionSummary.expired_at !== null &&
      sessionSummary.expired_at !== undefined,
  );

  // 3) Refresh attempt using the previously issued refresh token must fail
  await TestValidator.error(
    "refresh must be denied after logout (expired session)",
    async () => {
      const refreshBody = {
        refresh_token: refreshToken,
      } satisfies ICivicBoardUserSession.IRequest;
      await api.functional.auth.user.refresh(connection, { body: refreshBody });
    },
  );
}
