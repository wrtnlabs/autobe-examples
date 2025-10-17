import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";

/**
 * Validate moderator login success and rejection on invalid password.
 *
 * Business goal
 *
 * - Ensure a newly registered moderator can log in with valid credentials and
 *   receives an authorized session payload.
 * - Ensure an incorrect password leads to an authentication failure.
 *
 * Workflow
 *
 * 1. Setup: create a fresh moderator account via /auth/moderator/join.
 * 2. Happy path: POST /auth/moderator/login with correct email/password.
 * 3. Failure path: POST /auth/moderator/login with same email but wrong password
 *    must result in an error (no specific status code assertion).
 *
 * Notes
 *
 * - Use typia.assert() for perfect type validation of responses.
 * - Do not touch connection.headers; the SDK manages tokens automatically.
 */
export async function test_api_moderator_login_with_valid_credentials_and_401_on_invalid_password(
  connection: api.IConnection,
) {
  // 1) Setup: register a moderator account
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();
  const displayName: string & tags.MinLength<1> & tags.MaxLength<120> =
    typia.random<string & tags.MinLength<1> & tags.MaxLength<120>>();

  const joinBody = {
    email,
    password,
    display_name: displayName,
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussModerator.ICreate;

  const joined: IEconDiscussModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2) Happy path: login with correct credentials
  const successLogin: IEconDiscussModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email,
        password,
      } satisfies IEconDiscussModerator.ILogin,
    });
  typia.assert(successLogin);

  // Validate same account id between join and login
  TestValidator.equals(
    "login returns the same moderator id as joined",
    successLogin.id,
    joined.id,
  );

  // 3) Failure path: wrong password must fail
  const wrongPassword: string = `${password}x`;
  TestValidator.notEquals(
    "wrong password must differ from original",
    wrongPassword,
    password,
  );

  await TestValidator.error(
    "login with incorrect password must be rejected",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies IEconDiscussModerator.ILogin,
      });
    },
  );
}
