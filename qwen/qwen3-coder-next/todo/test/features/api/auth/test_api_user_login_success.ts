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

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a user first
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const registered = await authorize_user_join(adminConnection, {
    body: { email, password } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(registered);
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_user_login(loginConnection, {
    body: { email, password } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate response structure
  TestValidator.equals("user id matches", loginResult.id, registered.id);
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expiration",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable until",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
}
