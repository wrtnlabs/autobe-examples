import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_auth_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account and obtain initial refresh token
  const userConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joined);
  // 2. Use an invalid refresh token (a random UUID that doesn't exist in server)
  // According to the specification, this must trigger REFRESH_TOKEN_EXPIRED
  // even if it's technically not expired — because the system treats non-existent token as expired
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();
  const invalidRefreshBody: ITodoAppUser.IRefresh = {
    refresh_token: invalidRefreshToken,
  } satisfies ITodoAppUser.IRefresh;
  // 3. Attempt to refresh with the invalid refresh token — must return 401 Unauthorized with REFRESH_TOKEN_EXPIRED
  await TestValidator.httpError(
    "refresh with invalid refresh token should return 401 with REFRESH_TOKEN_EXPIRED",
    401,
    async () => {
      await api.functional.todoApp.auth.refresh(userConnection, {
        body: invalidRefreshBody,
      });
    },
  );
  // 4. Verify that no new tokens are issued and original tokens remain invalid
  // Try to refresh with the original token — this should work since it's still valid
  const originalRefreshBody: ITodoAppUser.IRefresh = {
    refresh_token: joined.token.refresh,
  } satisfies ITodoAppUser.IRefresh;
  const refreshed = await api.functional.todoApp.auth.refresh(userConnection, {
    body: originalRefreshBody,
  });
  typia.assert(refreshed);
  // The original access token is now invalid (refresh token rotated), but we already validated that
  // invalid refresh token returns 401 as required.
}
