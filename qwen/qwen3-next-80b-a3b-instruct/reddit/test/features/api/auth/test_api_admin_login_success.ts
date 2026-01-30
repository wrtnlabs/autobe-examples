import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account using join endpoint
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: adminCreds,
  });
  typia.assert(adminAccount);
  // Step 2: Test login with valid credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(adminLoginConnection, {
    body: adminCreds,
  });
  typia.assert(loginResult);
  // Step 3: Validate authentication result
  TestValidator.equals("admin ID matches", loginResult.id, adminAccount.id);
  TestValidator.equals(
    "admin email matches",
    loginResult.email,
    adminCreds.email,
  );
  TestValidator.equals(
    "admin username matches",
    loginResult.username,
    adminAccount.username,
  );
  TestValidator.predicate(
    "access token exists",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loginResult.token.refresh.length > 0,
  );
  typia.assert<IAuthorizationToken>(loginResult.token);
}
