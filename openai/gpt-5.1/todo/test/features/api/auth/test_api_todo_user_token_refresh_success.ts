import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserRefresh";

export async function test_api_todo_user_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid refresh request body.
  const body = typia.random<ITodoAppTodoUserRefresh.IRequest>();

  // 2. Call the refresh endpoint to obtain a new authorized session payload.
  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.refresh(connection, {
      body,
    });

  // 3. Strictly assert DTO structure of the authorization payload.
  typia.assert<ITodoAppTodoUser.IAuthorized>(authorized);

  // 4. Business sanity checks on the token and identity fields.
  TestValidator.predicate(
    "authorized.id must be a non-empty string",
    authorized.id.length > 0,
  );

  TestValidator.predicate(
    "authorized.email must be a non-empty string",
    authorized.email.length > 0,
  );

  TestValidator.predicate(
    "authorized.status must be a non-empty string",
    authorized.status.length > 0,
  );

  TestValidator.predicate(
    "access token must be non-empty",
    authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be non-empty",
    authorized.token.refresh.length > 0,
  );

  const now = Date.now();
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "access token expiration must be in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token refreshable_until must be in the future",
    refreshableUntil > now,
  );
}
