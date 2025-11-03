import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_revoke_refresh_tokens(
  connection: api.IConnection,
) {
  // 1. Create a new todoUser via POST /auth/todoUser/join
  const email = typia.random<string & tags.Format<"email">>();
  const createBody = {
    email,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: createBody });
  typia.assert(authorized);

  // Capture tokens for later verification
  const accessToken: string = authorized.token.access;
  const refreshToken: string = authorized.token.refresh;
  TestValidator.predicate("join returned access token", !!accessToken);
  TestValidator.predicate("join returned refresh token", !!refreshToken);

  // 2. Call revoke to revoke previously issued refresh tokens
  const summary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.revoke.revokeRefreshTokens(connection);
  typia.assert(summary);

  // Business-level validation: the revoke response should refer to the same user
  TestValidator.equals(
    "revoked user id matches joined user",
    summary.id,
    authorized.id,
  );

  // 3. Verify revocation by attempting to refresh using the old refresh token
  // Expect failure (business logic: refresh token revoked). We do not assert
  // specific HTTP status codes; just that the operation throws/rejects.
  await TestValidator.error(
    "refresh with revoked token should be rejected",
    async () => {
      await api.functional.auth.todoUser.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies ITodoAppTodoUser.IRefresh,
      });
    },
  );
}
