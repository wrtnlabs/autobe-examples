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
  // Step 1: Admin registers account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin@1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Create new connection for login (since join updates connection headers)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email: joinResponse.token.access,
      password: "Admin@1234",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate login response structure
  TestValidator.equals(
    "access token exists",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "expired_at is ISO date",
    loginResponse.token.expired_at.startsWith(
      new Date().toISOString().slice(0, 10),
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date",
    loginResponse.token.refreshable_until.startsWith(
      new Date().toISOString().slice(0, 10),
    ),
  );
}
