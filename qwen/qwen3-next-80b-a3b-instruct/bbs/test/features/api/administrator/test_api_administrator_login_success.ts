import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
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
  // Step 1: Create administrator connection and register account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.org`,
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(adminResult);
  // Step 2: Prepare login credentials using the registered administrator's email
  const loginCreds = {
    email: adminCreds.email,
    password: adminCreds.password,
  } satisfies IEconomicDiscussionAdministrator.ILogin;
  // Step 3: Create new connection for login attempt and authenticate
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: loginCreds,
  });
  typia.assert(loginResult);
  // Step 4: Validate that the login result contains the same administrator ID as the join result
  // This confirms the login operation correctly authenticated the previously created administrator
  TestValidator.equals(
    "admin ID matches between join and login",
    loginResult.id,
    adminResult.id,
  );
}
