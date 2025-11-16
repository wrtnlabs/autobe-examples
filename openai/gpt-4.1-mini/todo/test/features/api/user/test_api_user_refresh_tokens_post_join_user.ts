import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_user_refresh_tokens_post_join_user(
  connection: api.IConnection,
) {
  // 1. Register a new user with join endpoint
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const joinResponse: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(joinResponse);

  // 2. Use refresh token from join response to refresh authorization tokens
  const refreshBody = {
    refresh_token: joinResponse.token.refresh,
  } satisfies ITodoListTodoListUser.IRefresh;

  const refreshResponse: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResponse);

  // 3. Verify that user id is unchanged to ensure session continuity
  TestValidator.equals(
    "User id should remain the same after token refresh",
    refreshResponse.id,
    joinResponse.id,
  );

  // 4. Verify that access tokens are different to confirm renewal
  TestValidator.notEquals(
    "Access token should be renewed (different from join token)",
    refreshResponse.token.access,
    joinResponse.token.access,
  );

  // 5. Verify that refresh tokens are different to confirm renewal
  TestValidator.notEquals(
    "Refresh token should be renewed (different from join token)",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
}
