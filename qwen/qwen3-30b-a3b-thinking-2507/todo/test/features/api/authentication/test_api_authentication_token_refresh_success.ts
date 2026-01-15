import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_authentication_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member user with initial login details
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITodoUser.IJoin;
  const joinResult = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  // Step 2: Login to get initial tokens
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies ITodoUser.ILogin;
  const loginResult = await authorize_member_login(memberConnection, {
    body: loginInput,
  });
  // Step 3: Refresh access token using refresh token
  const refreshInput = {
    refresh: loginResult.token.refresh,
  } satisfies ITodoUser.IRefresh;
  const refreshResult = await authorize_member_refresh(memberConnection, {
    body: refreshInput,
  });
  // Step 4: Validate the token refresh process
  TestValidator.equals(
    "New access token should be different from original",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "New access token expiration should be newer",
    new Date(refreshResult.token.expired_at).getTime(),
    new Date(loginResult.token.expired_at).getTime(),
  );
  TestValidator.equals(
    "New refresh token should be different from original",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.notEquals(
    "New refresh token expiration should be newer",
    new Date(refreshResult.token.refreshable_until).getTime(),
    new Date(loginResult.token.refreshable_until).getTime(),
  );
}
