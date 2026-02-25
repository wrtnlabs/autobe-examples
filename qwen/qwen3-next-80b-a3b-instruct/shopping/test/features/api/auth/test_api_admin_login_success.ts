import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const joined = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  // Step 2: Login with the created admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IShoppingMallAdmin.ILogin;
  const loggedin = await authorize_admin_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loggedin);
  // Step 3: Validate response structure
  TestValidator.equals(
    "admin_id is a UUID",
    loggedin.admin_id,
    joined.admin_id,
  );
  TestValidator.equals(
    "access_token is set",
    loggedin.access_token.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh_token is set",
    loggedin.refresh_token.length > 0,
    true,
  );
  TestValidator.equals(
    "token.access is set",
    loggedin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token.refresh is set",
    loggedin.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate("expired_at is ISO date-time", () => {
    const date = new Date(loggedin.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is ISO date-time", () => {
    const date = new Date(loggedin.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
