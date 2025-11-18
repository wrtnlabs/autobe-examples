import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";

export async function test_api_member_user_login_respects_account_status(
  connection: api.IConnection,
) {
  // 1. Register a new member user via /auth/memberUser/join
  const joinBody = typia.random<ITodoAppMemberUserJoin.ICreate>();

  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(joined);

  // Preserve the baseline account identity and status from join
  const joinedId = joined.id;
  const joinedEmail = joined.email;
  const joinedStatus = joined.status;
  const joinedAccessToken = joined.token.access;

  // 2. Perform an explicit login with the same credentials
  const loginBody = {
    email: joinedEmail,
    password: joinBody.password,
    // Do not rely on client IP here; let it be null to keep things simple
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loggedIn: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(loggedIn);

  // 3. Validate that login reflects the same underlying member account
  TestValidator.equals("login keeps same member id", loggedIn.id, joinedId);
  TestValidator.equals(
    "login keeps same member email",
    loggedIn.email,
    joinedEmail,
  );
  TestValidator.equals(
    "login keeps same member status",
    loggedIn.status,
    joinedStatus,
  );

  // 4. Validate that tokens are renewed on login while representing same account
  TestValidator.notEquals(
    "login issues a new access token",
    loggedIn.token.access,
    joinedAccessToken,
  );

  // 5. Perform a second login attempt to ensure consistent behavior
  const secondLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: joinedEmail,
        password: joinBody.password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMemberUserLogin.ICreate,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(secondLogin);

  // The account identity and status should stay stable across repeated logins
  TestValidator.equals(
    "second login keeps same member id",
    secondLogin.id,
    joinedId,
  );
  TestValidator.equals(
    "second login keeps same member status",
    secondLogin.status,
    joinedStatus,
  );

  // Each login should be capable of issuing a fresh access token
  TestValidator.notEquals(
    "second login issues another new access token",
    secondLogin.token.access,
    loggedIn.token.access,
  );
}
