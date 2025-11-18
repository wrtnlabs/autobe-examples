import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify that a member user can refresh tokens after a login session, using the
 * refresh token returned from the login endpoint rather than the initial join
 * response.
 *
 * Business flow:
 *
 * 1. Register a new member user via /auth/memberUser/join.
 * 2. Log in again with the same credentials via /auth/memberUser/login.
 * 3. Call /auth/memberUser/refresh with the refresh token from the login response.
 * 4. Check that refreshed tokens are issued and that the identity matches.
 */
export async function test_api_member_user_token_refresh_after_login(
  connection: api.IConnection,
) {
  // 1. Register member user (join)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(joined);

  // Ensure join produced a valid token
  typia.assert<IAuthorizationToken>(joined.token);
  TestValidator.equals(
    "joined identity email should match join request email",
    joined.email,
    email,
  );

  // 2. Login with same credentials
  const loginBody = {
    email,
    password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loginAuth: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(loginAuth);
  typia.assert<IAuthorizationToken>(loginAuth.token);

  // Identity must match join
  TestValidator.equals(
    "login identity id should match join identity id",
    loginAuth.id,
    joined.id,
  );
  TestValidator.equals(
    "login identity email should match join identity email",
    loginAuth.email,
    joined.email,
  );

  // 3. Refresh using login's refresh token
  const refreshBody = {
    refreshToken: loginAuth.token.refresh,
  } satisfies ITodoAppMemberUserRefresh.IRequest;

  const refreshed: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(refreshed);
  typia.assert<IAuthorizationToken>(refreshed.token);

  // 4. Business validations
  // Identity consistency
  TestValidator.equals(
    "refreshed identity id should match login identity id",
    refreshed.id,
    loginAuth.id,
  );
  TestValidator.equals(
    "refreshed identity email should match login identity email",
    refreshed.email,
    loginAuth.email,
  );

  // Access token rotation: expect a different access token than login
  TestValidator.notEquals(
    "refreshed access token should differ from login access token",
    refreshed.token.access,
    loginAuth.token.access,
  );

  // Refresh token should be non-empty string
  TestValidator.predicate(
    "refreshed access token must be non-empty string",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token must be non-empty string",
    refreshed.token.refresh.length > 0,
  );
}
