import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account using authorize_super_administrator_join utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconomicDiscussionSuperAdministrator.IJoin;
  await authorize_super_administrator_join(superAdminConnection, {
    body: superAdminCreds,
  });
  // Step 2: Create a new connection for login using original base connection
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Login with created super administrator credentials
  const loginResponse: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await api.functional.economicDiscussion.auth.superAdministrator.login(
      loginConnection,
      {
        body: {
          email: superAdminCreds.email,
          password: superAdminCreds.password,
        } satisfies IEconomicDiscussionSuperAdministrator.ILogin,
      },
    );
  typia.assert(loginResponse);
  // Verify that authorization token header was set on the connection
  TestValidator.equals(
    "connection should have Authorization header",
    loginConnection.headers?.Authorization,
    loginResponse.token.access,
  );
}
