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
  // 1. Register a new administrator account
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinCredentials.email,
      password: joinCredentials.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate login response structure
  TestValidator.equals(
    "email matches",
    loginResult.email,
    joinCredentials.email,
  );
  TestValidator.equals("grade is ADMIN", loginResult.grade, "ADMIN");
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
}
