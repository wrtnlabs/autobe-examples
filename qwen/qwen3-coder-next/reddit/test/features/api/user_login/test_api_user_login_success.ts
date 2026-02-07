import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. First, create a new user through registration
  const registerConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  await authorize_user_join(registerConnection, {
    body: userCredentials,
  });
  // 2. Then login with the newly created user credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(loginConnection, {
    body: {
      email: userCredentials.email,
      password: userCredentials.password,
    } satisfies IRedditPlatformUser.ILogin,
  });
  // 3. Validate login response structure
  typia.assert(loginResponse);
  // 4. Verify token structure
  typia.assert<IAuthorizationToken>(loginResponse.token);
  // 5. Validate token properties
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expiration",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );
}
