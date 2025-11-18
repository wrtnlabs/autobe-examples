import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberUserLogoutAll } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogoutAll";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_logout_all_idempotent_when_no_active_sessions(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain initial authorized session
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // provide realistic but simple optional metadata
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(joined);

  // 2. Perform an initial global logout to ensure all existing sessions are expired.
  //    This also gives us a baseline behavior when at least one active session exists.
  const firstLogoutAll: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert(firstLogoutAll);

  // 3. Log in again to create a fresh session
  const loginRequest = {
    email: joinRequest.email,
    password: joinRequest.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/landing",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loggedIn: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginRequest,
    });
  typia.assert(loggedIn);

  // 4. Log out the current session so that there are no active sessions left
  const singleLogout: ITodoAppMemberUserLogout.IResponse =
    await api.functional.auth.memberUser.logout(connection);
  typia.assert(singleLogout);

  // 5. Call logoutAll again when there should be zero active sessions
  const secondLogoutAll: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert(secondLogoutAll);

  // 6. Business assertions about idempotent behavior when no active sessions exist
  TestValidator.equals(
    "logoutAll without active sessions should succeed",
    secondLogoutAll.success,
    true,
  );

  TestValidator.equals(
    "logoutAll without active sessions should affect zero sessions",
    secondLogoutAll.affectedSessionCount,
    0,
  );

  // message is optional and may be null/undefined; only assert it has a valid type shape
  TestValidator.predicate(
    "logoutAll message is either null/undefined or a string",
    () => {
      const msg = secondLogoutAll.message;
      if (msg === null || msg === undefined) return true;
      return typeof msg === "string";
    },
  );
}
