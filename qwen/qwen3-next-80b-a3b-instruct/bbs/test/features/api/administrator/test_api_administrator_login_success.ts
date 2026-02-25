import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account via join (required dependency)
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminJoinResult);
  // 2. Use the same credentials to perform successful login
  const loginCredentials: IEconomicBoardAdministrator.ILogin = {
    email: adminCredentials.email,
    password: adminCredentials.password,
  };
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // 3. Validate the login response structure matches IAuthorized
  TestValidator.equals(
    "administrator id is uuid",
    loginResult.id,
    adminJoinResult.id,
  );
  TestValidator.equals(
    "administrator email matches",
    loginResult.email,
    adminCredentials.email,
  );
  TestValidator.equals(
    "administrator role is administrator",
    loginResult.role,
    "administrator",
  );
  TestValidator.predicate(
    "access token is string",
    typeof loginResult.access_token === "string",
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof loginResult.refresh_token === "string",
  );
  TestValidator.predicate(
    "token access is string",
    typeof loginResult.token.access === "string",
  );
  TestValidator.predicate(
    "token refresh is string",
    typeof loginResult.token.refresh === "string",
  );
  TestValidator.equals(
    "display_name matches",
    loginResult.display_name,
    adminJoinResult.display_name,
  );
  TestValidator.equals("bio matches", loginResult.bio, adminJoinResult.bio);
  TestValidator.equals("is_banned is false", loginResult.is_banned, false);
  TestValidator.equals(
    "admin_request_status is approved",
    loginResult.admin_request_status,
    "approved",
  );
  TestValidator.equals(
    "admin_request_reason matches",
    loginResult.admin_request_reason,
    adminJoinResult.admin_request_reason,
  );
  TestValidator.equals(
    "created_at matches",
    loginResult.created_at,
    adminJoinResult.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loginResult.updated_at,
    adminJoinResult.updated_at,
  );
}
