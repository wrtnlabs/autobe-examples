import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_refresh_success(
  connection: api.IConnection,
) {
  // Happy-path E2E test for todoUser token refresh
  // 1) Create a new todoUser via join and obtain initial tokens and metadata
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const created: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Basic sanity checks on returned token container
  TestValidator.predicate(
    "join: access token present",
    typeof created.token.access === "string" && created.token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token present",
    typeof created.token.refresh === "string" &&
      created.token.refresh.length > 0,
  );

  // 2) Call refresh endpoint with the obtained refresh token
  const refreshBody = {
    refresh_token: created.token.refresh,
  } satisfies ITodoAppTodoUser.IRefresh;

  const refreshed: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3) Business assertions
  TestValidator.equals(
    "refreshed: user id matches created user",
    refreshed.id,
    created.id,
  );
  TestValidator.equals(
    "refreshed: user email matches created user",
    refreshed.email,
    created.email,
  );

  TestValidator.predicate(
    "refreshed: access token present",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );

  // Refresh token rotation is optional; only assert presence and validity
  TestValidator.predicate(
    "refreshed: refresh token present",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // Note: SDK sets connection.headers.Authorization automatically from response token.access.
  // No further protected endpoint smoke-check is executed because no additional
  // protected endpoints were provided in the available API list.
}
