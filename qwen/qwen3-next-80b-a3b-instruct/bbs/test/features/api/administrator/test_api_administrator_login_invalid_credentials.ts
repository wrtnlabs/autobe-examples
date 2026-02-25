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

export async function test_api_administrator_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  const invalidConnection: api.IConnection = { host: connection.host };
  // Use a random, non-existent email and incorrect password
  const invalidLogin: IEconomicBoardAdministrator.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // Expect 401 Unauthorized error due to invalid credentials
  await TestValidator.httpError(
    "should return 401 for invalid credentials",
    401,
    async () =>
      await api.functional.economicBoard.auth.administrator.login(
        invalidConnection,
        { body: invalidLogin },
      ),
  );
}
