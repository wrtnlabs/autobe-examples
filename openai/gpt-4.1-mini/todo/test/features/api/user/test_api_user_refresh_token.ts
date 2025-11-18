import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_refresh_token(connection: api.IConnection) {
  // 1. Register a new user to obtain initial tokens
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userCreateBody = {
    email: userEmail,
    password: "securePassword123",
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://referrer.example.com",
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Refresh tokens using the refresh token from initial authorization
  const refreshTokenBody = {
    refresh_token: authorizedUser.token.refresh,
  } satisfies ITodoListUser.IRefresh;

  const refreshedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshTokenBody,
    });
  typia.assert(refreshedUser);

  // 3. Validate that the refreshed tokens differ from the original tokens
  TestValidator.notEquals(
    "refreshed access token should differ from original",
    authorizedUser.token.access,
    refreshedUser.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token should differ from original",
    authorizedUser.token.refresh,
    refreshedUser.token.refresh,
  );
  TestValidator.equals(
    "user ID remains the same after token refresh",
    refreshedUser.id,
    authorizedUser.id,
  );
}
