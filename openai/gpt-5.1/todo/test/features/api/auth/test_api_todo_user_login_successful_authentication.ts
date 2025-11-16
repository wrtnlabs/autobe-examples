import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todo_user_login_successful_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser via join to get a concrete account to log in with.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const joinedUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(joinedUser);

  // 2. Build login request using the same credentials and realistic context.
  const loginRequestBody = {
    email: joinRequestBody.email,
    password: joinRequestBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserLogin.IRequest;

  // 3. Execute login and assert successful ITodoAppTodoUser.IAuthorized payload.
  const loginUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: loginRequestBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(loginUser);

  // 4. Identity consistency assertions.
  TestValidator.equals(
    "id must match joined user id",
    loginUser.id,
    joinedUser.id,
  );
  TestValidator.equals(
    "email must match join email",
    loginUser.email,
    joinRequestBody.email,
  );

  // Status should be a non-empty string (e.g., "active").
  TestValidator.predicate(
    "status must be non-empty string",
    loginUser.status.length > 0,
  );

  // 5. Timestamp consistency and monotonicity.
  const joinedCreatedAt = new Date(joinedUser.created_at);
  const joinedUpdatedAt = new Date(joinedUser.updated_at);
  const loginCreatedAt = new Date(loginUser.created_at);
  const loginUpdatedAt = new Date(loginUser.updated_at);

  // created_at should be stable between join and subsequent login.
  TestValidator.equals(
    "created_at must remain the same between join and login",
    loginUser.created_at,
    joinedUser.created_at,
  );

  // updated_at on login should be at least as recent as join's updated_at.
  TestValidator.predicate(
    "updated_at on login must be >= join updated_at",
    loginUpdatedAt.getTime() >= joinedUpdatedAt.getTime(),
  );

  // last_login_at handling: ensure it does not go backwards if present.
  const joinedLastLoginAtRaw = joinedUser.last_login_at ?? null;
  const loginLastLoginAtRaw = loginUser.last_login_at ?? null;

  if (loginLastLoginAtRaw !== null) {
    const loginLastLoginAt = new Date(loginLastLoginAtRaw);

    // last_login_at should not be before account creation.
    TestValidator.predicate(
      "last_login_at must be >= created_at",
      loginLastLoginAt.getTime() >= loginCreatedAt.getTime(),
    );

    if (joinedLastLoginAtRaw !== null) {
      const joinedLastLoginAt = new Date(joinedLastLoginAtRaw);
      TestValidator.predicate(
        "login last_login_at must be >= previous last_login_at when both exist",
        loginLastLoginAt.getTime() >= joinedLastLoginAt.getTime(),
      );
    }
  }

  // 6. Token structure and expiration semantics on login response.
  const token: IAuthorizationToken = loginUser.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token must be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty",
    token.refresh.length > 0,
  );

  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);

  TestValidator.predicate(
    "access token expiration must be in the future",
    expiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until must not be earlier than expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );

  // 7. Verify that login endpoint is callable without an existing Authorization header.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  const loginFromUnauth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(unauthConn, {
      body: loginRequestBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(loginFromUnauth);

  TestValidator.equals(
    "unauthenticated login must return same user id",
    loginFromUnauth.id,
    joinedUser.id,
  );
  TestValidator.equals(
    "unauthenticated login must return same user email",
    loginFromUnauth.email,
    joinRequestBody.email,
  );
}
