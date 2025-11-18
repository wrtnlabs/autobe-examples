import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that a member user's refresh token becomes unusable after logout of
 * the corresponding session.
 *
 * Business intent:
 *
 * - Ensure that calling POST /auth/memberUser/logout revokes the current session
 *   such that its refresh token can no longer be used with POST
 *   /auth/memberUser/refresh.
 * - Confirm that this revocation is scoped to the session, not a global account
 *   lockout, by showing that the system can still issue tokens for another
 *   account afterwards.
 *
 * End-to-end steps:
 *
 * 1. Join as a new member user and obtain initial tokens, capturing the refresh
 *    token.
 * 2. Log out the current session via /auth/memberUser/logout.
 * 3. Attempt to refresh tokens using the captured refresh token and verify that
 *    the call fails with an HTTP error (auth failure).
 * 4. Create another member user via join to show that the system still permits new
 *    authenticated sessions.
 */
export async function test_api_member_user_token_refresh_after_logout_single_session(
  connection: api.IConnection,
) {
  // 1. Join as a new member user and capture its refresh token
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  const initialToken: IAuthorizationToken = authorized.token;
  const refreshToken1: string = initialToken.refresh;

  // Sanity assertions on join result
  TestValidator.predicate(
    "join should issue non-empty access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "join should issue non-empty refresh token",
    authorized.token.refresh.length > 0,
  );

  // 2. Log out the current session
  const logoutResponse: ITodoAppMemberUserLogout.IResponse =
    await api.functional.auth.memberUser.logout(connection);
  typia.assert(logoutResponse);
  TestValidator.predicate(
    "logout response should indicate success",
    logoutResponse.success === true,
  );

  // 3. Attempt to refresh tokens using the revoked refresh token
  const refreshRequest = {
    refreshToken: refreshToken1,
  } satisfies ITodoAppMemberUserRefresh.IRequest;

  await TestValidator.httpError(
    "refresh with revoked token should fail after logout",
    [401, 403],
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: refreshRequest,
      });
    },
  );

  // 4. Demonstrate that the system can still issue tokens for another account
  const secondJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const secondAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondJoinRequest,
    });
  typia.assert(secondAuthorized);

  TestValidator.predicate(
    "second join should succeed and issue valid access token",
    secondAuthorized.token.access.length > 0,
  );
}
