import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";

/**
 * Validate refresh token replay protection and rotation semantics.
 *
 * Business goal: Verify that the memberUser refresh endpoint enforces
 * single-use semantics for refresh tokens (replay protection) while continuing
 * to accept the latest issued refresh token. Also check that successful refresh
 * operations rotate access tokens so that each step gets a fresh credential
 * set.
 *
 * High-level steps:
 *
 * 1. Join a new member user account.
 * 2. Login with that account to obtain the initial ITodoAppMemberUser.IAuthorized
 *    containing token.access and token.refresh.
 * 3. Use refreshToken1 (from login) to perform a first refresh and capture
 *    refreshToken2.
 * 4. Attempt to refresh again using the original refreshToken1 and expect an error
 *    (TestValidator.error) to represent replay protection.
 * 5. Refresh again using refreshToken2 and expect success.
 * 6. Confirm all successful responses are structurally valid via typia.assert and
 *    that access tokens are rotated between steps.
 */
export async function test_api_member_user_refresh_replay_with_same_token(
  connection: api.IConnection,
) {
  // 1. Join new member user
  const joinBody = typia.random<ITodoAppMemberUserJoin.ICreate>();
  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login with same credentials to get initial tokens
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;
  const loggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  const loginToken: IAuthorizationToken = loggedIn.token;
  const refreshToken1: string = loginToken.refresh;

  // 3. First refresh using refreshToken1
  const firstRefreshBody = {
    refresh_token: refreshToken1,
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserRefresh.ICreate;
  const firstRefreshed: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(firstRefreshed);

  const firstRefreshToken: IAuthorizationToken = firstRefreshed.token;
  const refreshToken2: string = firstRefreshToken.refresh;

  // Validate rotation of access token between login and first refresh
  TestValidator.notEquals(
    "access token is rotated on first refresh",
    loginToken.access,
    firstRefreshToken.access,
  );

  // 4. Second refresh attempt using original refreshToken1 (expect error)
  const replayBody = {
    refresh_token: refreshToken1,
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserRefresh.ICreate;

  await TestValidator.error(
    "replay of already-used refresh token should fail",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: replayBody,
      });
    },
  );

  // 5. Refresh again using latest refreshToken2 (expect success)
  const secondRefreshBody = {
    refresh_token: refreshToken2,
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserRefresh.ICreate;

  const secondRefreshed: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(secondRefreshed);

  const secondRefreshToken: IAuthorizationToken = secondRefreshed.token;

  // 6. Confirm that access token rotates again and refresh token chain progresses
  TestValidator.notEquals(
    "access token is rotated on second refresh",
    firstRefreshToken.access,
    secondRefreshToken.access,
  );
}
