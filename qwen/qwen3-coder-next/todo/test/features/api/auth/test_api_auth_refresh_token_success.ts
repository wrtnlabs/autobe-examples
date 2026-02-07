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

export async function test_api_auth_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register user via join endpoint with real credentials
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = "testpassword123";
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  // Step 2: Login to obtain initial access and refresh tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Refresh token using the refresh token from login response
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh: loginResponse.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // Validate response structure contains all required fields
  TestValidator.equals(
    "access token is string",
    typeof refreshResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof refreshResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is string",
    typeof refreshResponse.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until is string",
    typeof refreshResponse.token.refreshable_until,
    "string",
  );
}
