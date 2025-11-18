import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserLogoutAll } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogoutAll";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_logout_all_with_multiple_sessions(
  connection: api.IConnection,
) {
  // 1. Register a new member user to create the first authenticated session (Session A)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const sessionA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(sessionA);

  const email = sessionA.email;
  const password = joinBody.password;

  // 2. Perform additional logins on the same account to simulate multiple sessions
  const loginBodyBase = {
    email,
    password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const sessionB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBodyBase,
    });
  typia.assert(sessionB);

  const sessionC: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBodyBase,
    });
  typia.assert(sessionC);

  // 3. Using the currently authenticated session (latest login), call logoutAll
  const logoutAllResponse: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert(logoutAllResponse);

  TestValidator.predicate(
    "logoutAll success flag should be true",
    logoutAllResponse.success === true,
  );

  TestValidator.predicate(
    "logoutAll affectedSessionCount should be >= 1",
    logoutAllResponse.affectedSessionCount >= 1,
  );

  // 4. Immediately calling logoutAll again with the same token should fail
  await TestValidator.error(
    "calling logoutAll again with an already invalidated session must fail",
    async () => {
      await api.functional.auth.memberUser.logoutAll(connection);
    },
  );

  // 5. Perform a fresh login to confirm that new tokens work after global logout
  const freshLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBodyBase,
    });
  typia.assert(freshLogin);

  TestValidator.equals(
    "fresh login should be for the same member user id",
    freshLogin.id,
    sessionA.id,
  );

  // 6. Call logoutAll again with the fresh session to ensure it still functions
  const secondLogoutAll: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert(secondLogoutAll);

  TestValidator.predicate(
    "second logoutAll success flag should be true",
    secondLogoutAll.success === true,
  );

  TestValidator.predicate(
    "second logoutAll affectedSessionCount should be >= 1",
    secondLogoutAll.affectedSessionCount >= 1,
  );
}
