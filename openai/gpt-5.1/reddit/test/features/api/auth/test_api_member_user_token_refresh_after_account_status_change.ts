import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate memberUser token refresh lifecycle and identity snapshot stability.
 *
 * This test exercises the /auth/memberUser/join, /auth/memberUser/login, and
 * /auth/memberUser/refresh endpoints together to ensure that a valid refresh
 * token can be exchanged for a new authorization envelope while preserving the
 * member user's identity and account status snapshot.
 *
 * Original scenario mentioned changing account status via platformAdmin
 * endpoints, but those APIs are not available in this context. Instead, this
 * test focuses on verifying that:
 *
 * - A newly registered member user can log in and obtain a refresh token.
 * - The refresh endpoint accepts that refresh token and issues a new set of
 *   tokens.
 * - Identity fields (id, username, email) and status snapshot fields (statusCode,
 *   accountStatusKey) remain consistent between login and refresh responses.
 * - The token bundle is rotated: token.access and token.refresh change between
 *   login and refresh responses, and accessToken/refreshToken fields on the
 *   IAuthorized DTO, when present, also change.
 * - A refresh token issued directly from the join response can also be used with
 *   the refresh endpoint, when provided by the backend.
 *
 * High-level flow:
 *
 * 1. Join: create a new member user with random username/email/password and basic
 *    session metadata (href, referrer).
 * 2. Login: authenticate with identifier=email and the same password, capturing
 *    the IAuthorized response and its token + refreshToken fields.
 * 3. Refresh (login token): call /auth/memberUser/refresh with the refresh token
 *    taken from the login response (or IAuthorizationToken.refresh as a
 *    fallback) and assert:
 *
 *    - Typia.assert on the refreshed IAuthorized object
 *    - Id/username/email are equal to the login response
 *    - StatusCode and accountStatusKey are equal to the login response
 *    - Token.access and token.refresh differ from the login response values
 *    - AccessToken and refreshToken fields, if defined in both responses, differ
 *         between login and refresh
 * 4. Refresh (join token, optional path): if the join response contained a
 *    refreshToken or token.refresh value, call refresh again with that token
 *    and perform the same assertions relative to the join response.
 */
export async function test_api_member_user_token_refresh_after_account_status_change(
  connection: api.IConnection,
) {
  // 1. Join: create a new member user
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password,
    // optional ip can be null or omitted; use explicit null
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic sanity checks on join response
  await TestValidator.predicate(
    "join: id is non-empty",
    () => joined.id.length > 0,
  );
  await TestValidator.predicate(
    "join: username matches requested",
    () => joined.username === joinBody.username,
  );
  await TestValidator.predicate(
    "join: email matches requested",
    () => joined.email === joinBody.email,
  );

  // 2. Login: authenticate with same email + password
  const loginBody = {
    identifier: joinBody.email,
    password,
    ip: null,
    href: "https://example.com/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/join-complete" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Identity consistency between join and login
  TestValidator.equals("login: id equals join id", loggedIn.id, joined.id);
  TestValidator.equals(
    "login: username equals join username",
    loggedIn.username,
    joined.username,
  );
  TestValidator.equals(
    "login: email equals join email",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "login: statusCode equals join statusCode",
    loggedIn.statusCode,
    joined.statusCode,
  );
  TestValidator.equals(
    "login: accountStatusKey equals join accountStatusKey",
    loggedIn.accountStatusKey,
    joined.accountStatusKey,
  );

  // Capture token and optional top-level access/refresh strings from login
  const loginToken: IAuthorizationToken = loggedIn.token;
  const loginAccessToken: string | undefined = loggedIn.accessToken;
  const loginRefreshTokenString: string | undefined = loggedIn.refreshToken;

  // Choose refresh token source for the main refresh test
  const primaryRefreshToken: string =
    loginRefreshTokenString ?? loginToken.refresh;

  const refreshBodyFromLogin = {
    refresh_token: primaryRefreshToken,
  } satisfies ICommunityPlatformMemberuser.IRefreshRequest;

  const refreshedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBodyFromLogin,
    });
  typia.assert(refreshedFromLogin);

  // 3. Assertions comparing login vs refresh-from-login
  TestValidator.equals(
    "refresh(login): id equals login id",
    refreshedFromLogin.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "refresh(login): username equals login username",
    refreshedFromLogin.username,
    loggedIn.username,
  );
  TestValidator.equals(
    "refresh(login): email equals login email",
    refreshedFromLogin.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "refresh(login): statusCode equals login statusCode",
    refreshedFromLogin.statusCode,
    loggedIn.statusCode,
  );
  TestValidator.equals(
    "refresh(login): accountStatusKey equals login accountStatusKey",
    refreshedFromLogin.accountStatusKey,
    loggedIn.accountStatusKey,
  );

  // Token rotation check via IAuthorizationToken
  const refreshedLoginToken: IAuthorizationToken = refreshedFromLogin.token;
  TestValidator.notEquals(
    "refresh(login): token.access should be rotated",
    refreshedLoginToken.access,
    loginToken.access,
  );
  TestValidator.notEquals(
    "refresh(login): token.refresh should be rotated",
    refreshedLoginToken.refresh,
    loginToken.refresh,
  );

  // Optional top-level accessToken / refreshToken rotation checks when present
  if (
    loginAccessToken !== undefined &&
    refreshedFromLogin.accessToken !== undefined
  ) {
    TestValidator.notEquals(
      "refresh(login): accessToken field should be rotated when present",
      refreshedFromLogin.accessToken,
      loginAccessToken,
    );
  }

  if (
    loginRefreshTokenString !== undefined &&
    refreshedFromLogin.refreshToken !== undefined
  ) {
    TestValidator.notEquals(
      "refresh(login): refreshToken field should be rotated when present",
      refreshedFromLogin.refreshToken,
      loginRefreshTokenString,
    );
  }

  // 4. Optional path: use join-issued refresh token if available
  const joinRefreshTokenString: string | undefined = joined.refreshToken;
  const joinToken: IAuthorizationToken = joined.token;

  const secondaryRefreshToken: string | undefined =
    joinRefreshTokenString ?? joinToken.refresh;

  if (secondaryRefreshToken !== undefined) {
    const refreshBodyFromJoin = {
      refresh_token: secondaryRefreshToken,
    } satisfies ICommunityPlatformMemberuser.IRefreshRequest;

    const refreshedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.refresh(connection, {
        body: refreshBodyFromJoin,
      });
    typia.assert(refreshedFromJoin);

    // Identity consistency relative to join
    TestValidator.equals(
      "refresh(join): id equals join id",
      refreshedFromJoin.id,
      joined.id,
    );
    TestValidator.equals(
      "refresh(join): username equals join username",
      refreshedFromJoin.username,
      joined.username,
    );
    TestValidator.equals(
      "refresh(join): email equals join email",
      refreshedFromJoin.email,
      joined.email,
    );
    TestValidator.equals(
      "refresh(join): statusCode equals join statusCode",
      refreshedFromJoin.statusCode,
      joined.statusCode,
    );
    TestValidator.equals(
      "refresh(join): accountStatusKey equals join accountStatusKey",
      refreshedFromJoin.accountStatusKey,
      joined.accountStatusKey,
    );

    const refreshedJoinToken: IAuthorizationToken = refreshedFromJoin.token;
    TestValidator.notEquals(
      "refresh(join): token.access should be rotated",
      refreshedJoinToken.access,
      joinToken.access,
    );
    TestValidator.notEquals(
      "refresh(join): token.refresh should be rotated",
      refreshedJoinToken.refresh,
      joinToken.refresh,
    );

    const joinAccessToken: string | undefined = joined.accessToken;
    const joinRefreshTokenField: string | undefined = joined.refreshToken;

    if (
      joinAccessToken !== undefined &&
      refreshedFromJoin.accessToken !== undefined
    ) {
      TestValidator.notEquals(
        "refresh(join): accessToken field should be rotated when present",
        refreshedFromJoin.accessToken,
        joinAccessToken,
      );
    }

    if (
      joinRefreshTokenField !== undefined &&
      refreshedFromJoin.refreshToken !== undefined
    ) {
      TestValidator.notEquals(
        "refresh(join): refreshToken field should be rotated when present",
        refreshedFromJoin.refreshToken,
        joinRefreshTokenField,
      );
    }
  }
}
