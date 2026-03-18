import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_credential_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const joinedConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_administrator_join(joinedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const loginConnection: api.IConnection = { host: connection.host };
  const login: IShoppingMallAdministrator.ILogin = {
    email: joined.email,
    password: RandomGenerator.alphaNumeric(16),
  };
  await TestValidator.error(
    "administrator login should reject mismatched credentials",
    async () => {
      await authorize_administrator_login(loginConnection, { body: login });
    },
  );
}
