import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid superAdministrator account for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IEconomicBoardSuperAdministrator.IJoin,
  });
  typia.assert(joined);
  // Login with the created superAdministrator account using the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const logged = await authorize_super_administrator_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  });
  typia.assert(logged);
  // Validate user ID matches
  TestValidator.equals("user ID matches", logged.id, joined.id);
}
