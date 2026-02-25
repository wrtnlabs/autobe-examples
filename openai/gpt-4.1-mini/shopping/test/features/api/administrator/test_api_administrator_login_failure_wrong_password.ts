import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_failure_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account with a known valid password
  const adminConnection: api.IConnection = { host: connection.host };
  const validPassword = RandomGenerator.alphaNumeric(16);
  const joinedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: validPassword,
    },
  });
  typia.assert(joinedAdmin);
  // 2. Attempt to log in with the wrong password
  const wrongPassword = validPassword + "_wrong";
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "administrator login failure with wrong password",
    async () => {
      await authorize_administrator_login(loginConnection, {
        body: {
          email: joinedAdmin.email,
          password: wrongPassword,
        },
      });
    },
  );
}
