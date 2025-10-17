import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Member login succeeds for an existing account.
 *
 * Flow
 *
 * 1. Register a new Member via POST /auth/member/join capturing email/password.
 * 2. Login via POST /auth/member/login using the same credentials.
 * 3. Validate that the login response contains non-empty access/refresh tokens and
 *    that the authenticated id matches the account created in step 1.
 * 4. Negative check: logging in with a wrong password should fail.
 *
 * Notes
 *
 * - Typia.assert() validates all structural and format constraints, including ISO
 *   8601 timestamps in token.expired_at and token.refreshable_until.
 * - We do not assert on HTTP status codes; we only validate success vs. error.
 */
export async function test_api_member_login_success_existing_user(
  connection: api.IConnection,
) {
  // 1) Register a new Member (dependency for login)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();

  const joinBody = {
    email,
    password,
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    // avatar_uri is optional; omit or set when desired
  } satisfies IEconDiscussMember.ICreate;

  const joined = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(joined);

  // Sanity-check business logic: tokens must be non-empty strings
  TestValidator.predicate(
    "join: access token should be non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token should be non-empty",
    joined.token.refresh.length > 0,
  );

  // 2) Login with the same credentials
  const loginBody = {
    email,
    password,
  } satisfies IEconDiscussMember.ILogin;

  const loggedIn = await api.functional.auth.member.login(connection, {
    body: loginBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(loggedIn);

  // Validate identity consistency and token sanity
  TestValidator.equals(
    "login: authenticated id matches the joined account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.predicate(
    "login: access token should be non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: refresh token should be non-empty",
    loggedIn.token.refresh.length > 0,
  );

  // Optionally validate subject snapshot shape when present
  if (joined.member) typia.assert(joined.member);
  if (loggedIn.member) typia.assert(loggedIn.member);

  // 3) Negative check: wrong password should fail
  const wrongPasswordLogin = {
    email,
    password: (password + "x") as string, // still a valid string with length >= 9
  } satisfies IEconDiscussMember.ILogin;
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: wrongPasswordLogin,
      });
    },
  );
}
