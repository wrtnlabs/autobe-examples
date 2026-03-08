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

export async function test_api_administrator_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(joinConnection, {
    body: {
      email,
      password: correctPassword,
    },
  });
  // 2. Attempt login with correct email but WRONG password
  const wrongPassword = correctPassword + "_wrong";
  await TestValidator.httpError(
    "login should fail with incorrect password",
    401,
    async () => {
      await api.functional.shoppingMall.auth.administrator.login(connection, {
        body: {
          email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: null,
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdministrator.ILogin,
      });
    },
  );
}
