import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_login_existing(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate end-to-end login flow for a newly-registered todoUser.
   *
   * Steps:
   *
   * 1. Register a new user via POST /auth/todoUser/join
   * 2. Login with the same credentials via POST /auth/todoUser/login
   * 3. Assert both responses using typia.assert()
   * 4. Verify tokens exist and are parseable as dates
   * 5. Verify returned user id is consistent between join and login
   */

  // 1) Prepare unique credentials and session context
  const localPart = RandomGenerator.alphaNumeric(8);
  const email = `${localPart}@example.com`;
  const password = "Passw0rd!"; // >= 8 chars as required by DTO
  const href = "http://localhost/";
  const referrer = "http://localhost/ref";

  // 2) Join (create) the todoUser account
  const joinBody = {
    email,
    password,
    displayName: RandomGenerator.name(2),
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppTodoUser.ICreate;

  const joined: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  // Full runtime schema validation
  typia.assert(joined);

  // Sanity: token container exists on join response
  typia.assert<IAuthorizationToken>(joined.token);

  // 3) Login using same credentials
  const loginBody = {
    email,
    password,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppTodoUser.ILogin;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // 4) Validate token presence and basic properties
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // 5) Validate token date strings are parseable
  TestValidator.predicate(
    "access token expired_at should be a valid date-time",
    !Number.isNaN(new Date(authorized.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refresh token refreshable_until should be a valid date-time",
    !Number.isNaN(new Date(authorized.token.refreshable_until).getTime()),
  );

  // 6) Business-level validation: joined user id matches login user id
  TestValidator.equals(
    "joined and logged user ids should match",
    authorized.id,
    joined.id,
  );

  // 7) Do not assert or access any sensitive server-side fields (password_hash, mfa_secret, etc.)
  //    The DTO deliberately excludes them. typia.assert covers response shape and formats.
}
