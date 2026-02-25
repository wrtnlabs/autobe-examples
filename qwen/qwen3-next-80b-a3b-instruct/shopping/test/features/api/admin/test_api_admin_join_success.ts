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

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successful admin account registration with valid credentials
  // 1. Generate valid admin credentials with email and secure password (>=8 chars)
  // 2. Call authorize_admin_join utility function (priority over SDK)
  // 3. Validate response contains access_token, refresh_token, and admin_id
  // 4. Verify type safety with typia.assert
  // 5. Confirm connection headers are updated with access token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const result = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(result);
  // Validate response structure
  TestValidator.predicate(
    "access_token exists",
    result.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token exists",
    result.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "admin_id is UUID",
    /^[0-9a-f-]{36}$/i.test(result.admin_id),
  );
  // Verify connection headers were updated
  TestValidator.predicate(
    "connection has authorization header",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access_token",
    adminConnection.headers?.Authorization,
    `Bearer ${result.access_token}`,
  );
}
