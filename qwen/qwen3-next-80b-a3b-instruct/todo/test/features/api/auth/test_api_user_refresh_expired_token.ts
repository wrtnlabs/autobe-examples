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

export async function test_api_user_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user to obtain a refresh token
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinResponse);
  // Extract the initial refresh token
  const initialRefreshToken = joinResponse.token.refresh;
  // Step 2: Use the initial refresh token to successfully refresh
  // This rotates the token and invalidates the initial one
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection1, {
    body: { refresh: initialRefreshToken } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 3: Attempt to use the initial refresh token again (now invalidated)
  // This should result in 401 Unauthorized as per the scenario
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with expired/invalidated token returns 401",
    401,
    async () => {
      await authorize_user_refresh(refreshConnection2, {
        body: { refresh: initialRefreshToken } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
  // Note: The system does not issue new tokens for an expired/invalidated refresh token,
  // and the old token is permanently invalidated, preventing replay attacks.
}
