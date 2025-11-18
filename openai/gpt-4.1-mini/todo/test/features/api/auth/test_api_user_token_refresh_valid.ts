import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_token_refresh_valid(
  connection: api.IConnection,
) {
  // Step 1: Register a new user via join endpoint
  const userCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreate });
  typia.assert(authorizedUser);

  // Validate the structure of token
  TestValidator.predicate(
    "refresh token is non-empty",
    authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorizedUser.token.access.length > 0,
  );

  // Step 2: Use refresh token to get new access token
  const refreshRequest = {
    refreshToken: authorizedUser.token.refresh,
  } satisfies ITodoListTodoListUser.IRefresh;

  const refreshedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshedUser);

  // Validate new tokens are present and differ from original
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new access token is non-empty",
    refreshedUser.token.access.length > 0,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    refreshedUser.token.refresh,
    authorizedUser.token.refresh,
  );
  TestValidator.notEquals(
    "access tokens differ",
    refreshedUser.token.access,
    authorizedUser.token.access,
  );

  // Validate expiration timestamps format and logical order
  // Check ISO 8601 date-time format via typia.assert function
  typia.assert<string & tags.Format<"date-time">>(
    refreshedUser.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshedUser.token.refreshable_until,
  );

  // Validate that refreshable_until is not earlier than expired_at
  const expiredAt = new Date(refreshedUser.token.expired_at);
  const refreshableUntil = new Date(refreshedUser.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after or same as expired_at",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
}
