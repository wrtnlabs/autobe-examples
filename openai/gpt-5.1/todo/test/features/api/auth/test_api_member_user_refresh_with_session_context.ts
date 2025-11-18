import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserRefresh";

export async function test_api_member_user_refresh_with_session_context(
  connection: api.IConnection,
) {
  // 1. Register a new member user with realistic join payload including session context
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
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://app.todo.example.com/signup",
    referrer: "https://landing.todo.example.com/",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Login with same credentials and contextual metadata
  const loginBody = {
    email,
    password,
    ip: "203.0.113.10",
    href: "https://app.todo.example.com/login",
    referrer: "https://app.todo.example.com/",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loginAuth: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuth);

  // 3. Build refresh payload with refresh token and optional contextual metadata
  const refreshBody = {
    refresh_token: loginAuth.token.refresh,
    ip: "203.0.113.20",
    href: "https://app.todo.example.com/token/refresh",
    referrer: "https://app.todo.example.com/dashboard",
  } satisfies ITodoAppMemberUserRefresh.ICreate;

  // 4. Call refresh endpoint
  const refreshedAuth: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuth);

  // 5. Validate identity continuity and token updates
  TestValidator.equals(
    "principal id must stay same after refresh",
    refreshedAuth.id,
    loginAuth.id,
  );

  TestValidator.equals(
    "principal email must stay same after refresh",
    refreshedAuth.email,
    loginAuth.email,
  );

  TestValidator.equals(
    "status must stay same after refresh",
    refreshedAuth.status,
    loginAuth.status,
  );

  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedAuth.token.access,
    loginAuth.token.access,
  );

  TestValidator.notEquals(
    "refresh token should be rotated on refresh",
    refreshedAuth.token.refresh,
    loginAuth.token.refresh,
  );

  TestValidator.predicate(
    "refreshable_until should not move backwards in time (lex order)",
    refreshedAuth.token.refreshable_until >= loginAuth.token.refreshable_until,
  );
}
