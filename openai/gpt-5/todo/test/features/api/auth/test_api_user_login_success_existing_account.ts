import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Verify that an existing account can log in and receive fresh tokens.
 *
 * Business objectives:
 *
 * - A user who has signed up via POST /auth/user/join can authenticate via POST
 *   /auth/user/login using the same email/password.
 * - Successful login yields an authorized context (IAuthorized) including a JWT
 *   token bundle (access/refresh) and user identity.
 * - Repeated logins create distinct sessions; tokens should rotate so that a
 *   subsequent login issues different tokens from a previous one while
 *   preserving the same user identity.
 *
 * Steps:
 *
 * 1. Register a user (ITodoUser.IJoin) and assert IAuthorized output.
 * 2. Login with the same credentials (ITodoUser.ILogin) and assert output.
 * 3. Validate identity consistency (id/email) and token presence.
 * 4. Login again to confirm token rotation (access/refresh change) while id/email
 *    remain.
 * 5. Protected endpoint verification is skipped (not provided in inputs).
 */
export async function test_api_user_login_success_existing_account(
  connection: api.IConnection,
) {
  // 1) Register a new user account to authenticate against
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\\\d).{8,}$"> &
        tags.Format<"password">
    >(),
    ip: null, // optional session context; explicitly null is allowed
    href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    referrer: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
    >(),
  } satisfies ITodoUser.IJoin;

  const joined: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(joined);

  // 2) First login using the same credentials
  const loginBody1 = {
    email: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    referrer: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
    >(),
  } satisfies ITodoUser.ILogin;

  const first: ITodoUser.IAuthorized = await api.functional.auth.user.login(
    connection,
    { body: loginBody1 },
  );
  typia.assert(first);

  // 3) Identity consistency and token presence
  TestValidator.equals(
    "login returns the same user id as joined",
    first.id,
    joined.id,
  );
  TestValidator.equals(
    "login returns the same email as joined",
    first.email,
    joined.email,
  );
  TestValidator.predicate(
    "access token from first login is non-empty",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token from first login is non-empty",
    first.token.refresh.length > 0,
  );

  // 4) Second login to verify token rotation (distinct session context)
  const loginBody2 = {
    email: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    referrer: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
    >(),
  } satisfies ITodoUser.ILogin;

  const second: ITodoUser.IAuthorized = await api.functional.auth.user.login(
    connection,
    { body: loginBody2 },
  );
  typia.assert(second);

  // Identity remains the same across logins
  TestValidator.equals(
    "second login returns the same user id",
    second.id,
    joined.id,
  );
  TestValidator.equals(
    "second login returns the same email",
    second.email,
    joined.email,
  );

  // Tokens should rotate across separate logins (distinct sessions)
  TestValidator.notEquals(
    "access token should rotate between logins",
    second.token.access,
    first.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate between logins",
    second.token.refresh,
    first.token.refresh,
  );
}
