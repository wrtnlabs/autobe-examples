import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that logging out a member user invalidates the associated refresh
 * token.
 *
 * Business purpose:
 *
 * - Ensure that when a member user explicitly logs out, the backend terminates
 *   the active session such that the old refresh token can no longer be used to
 *   obtain new access tokens.
 * - Confirm that logout only affects the specific session, not the entire
 *   account, by verifying that the user can still log in again afterward and
 *   receive a new token pair.
 *
 * Steps:
 *
 * 1. Join (register) a new member user and capture the initial
 *    ITodoAppMemberuser.IAuthorized.
 * 2. Store the first issued refresh token string.
 * 3. Call logout to terminate the current session and assert success.
 * 4. Attempt to refresh tokens using the old refresh token and expect an HTTP auth
 *    error.
 * 5. Perform a login again with the same credentials and ensure a new authorized
 *    context is issued with a different refresh token string.
 */
export async function test_api_member_user_logout_prevents_token_refresh_for_terminated_session(
  connection: api.IConnection,
) {
  // 1. Register a fresh member user (join) and capture the initial authorized context.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/auth/join",
    referrer: "https://todo-app.example.com/",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const initialAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(initialAuth);

  const initialToken: IAuthorizationToken = initialAuth.token;
  const refreshToken1: string = initialToken.refresh;

  // 2. Call logout to terminate the current session.
  const logoutResult: ITodoAppMemberUserLogout.IResponse =
    await api.functional.auth.memberUser.logout(connection);
  typia.assert(logoutResult);

  TestValidator.predicate(
    "logout should indicate success",
    logoutResult.success === true,
  );

  // 3. Attempt to refresh tokens using the old refresh token; expect auth error.
  const refreshBody = {
    refreshToken: refreshToken1,
  } satisfies ITodoAppMemberUserRefresh.IRequest;

  await TestValidator.httpError(
    "refresh with logged-out session's refresh token must fail",
    [401, 403],
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: refreshBody,
      });
    },
  );

  // 4. Verify that the account itself is still usable by logging in again.
  const loginBody = {
    email,
    password,
    ip: null,
    href: "https://todo-app.example.com/auth/login",
    referrer: "https://todo-app.example.com/",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const reAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(reAuth);

  const newToken: IAuthorizationToken = reAuth.token;

  // Ensure the new refresh token is different from the old one to prove rotation.
  TestValidator.notEquals(
    "new refresh token should differ from old refresh token after logout and re-login",
    newToken.refresh,
    refreshToken1,
  );
}
