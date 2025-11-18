import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";

export async function test_api_member_user_login_success_after_join(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joined = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppMemberUser.IAuthorized>(joined);

  // 2. Login with the same credentials
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loggedIn = await api.functional.auth.memberUser.login(connection, {
    body: loginBody,
  });
  typia.assert<ITodoAppMemberUser.IAuthorized>(loggedIn);

  // 3. Validate identity consistency
  TestValidator.equals(
    "member id should be consistent between join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should be consistent between join and login",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "member status should be consistent between join and login",
    loggedIn.status,
    joined.status,
  );

  const joinedDisplay = joined.display_name ?? null;
  const loggedDisplay = loggedIn.display_name ?? null;
  TestValidator.equals(
    "display_name should be consistent between join and login (null-normalized)",
    loggedDisplay,
    joinedDisplay,
  );

  // 4. Validate token issuance semantics
  TestValidator.predicate(
    "login should issue a new access token different from join",
    loggedIn.token.access !== joined.token.access,
  );
  TestValidator.predicate(
    "login should issue a new refresh token different from join",
    loggedIn.token.refresh !== joined.token.refresh,
  );

  TestValidator.predicate(
    "logged-in access token must be non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "logged-in refresh token must be non-empty",
    loggedIn.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "logged-in expired_at must be non-empty",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "logged-in refreshable_until must be non-empty",
    loggedIn.token.refreshable_until.length > 0,
  );
}
