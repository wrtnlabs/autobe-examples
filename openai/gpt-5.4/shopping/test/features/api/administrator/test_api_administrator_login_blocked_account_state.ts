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

export async function test_api_administrator_login_blocked_account_state(
  connection: api.IConnection,
): Promise<void> {
  const joinedAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = typia.random<string & tags.Format<"password">>();
  const joinInput = {
    email: joinEmail,
    password: joinPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdministrator.IJoin;
  const joined = await authorize_administrator_join(
    joinedAdministratorConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joined);
  TestValidator.equals(
    "joined administrator email matches join input",
    joined.email,
    joinEmail,
  );
  TestValidator.equals(
    "joined administrator is not banned",
    joined.banned,
    false,
  );
  TestValidator.predicate(
    "successful join installs authorization header",
    typeof joinedAdministratorConnection.headers?.Authorization === "string" &&
      joinedAdministratorConnection.headers.Authorization.length > 0,
  );
  const unavailableAdministratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const unavailableAdministratorLoginInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IShoppingMallAdministrator.ILogin;
  await TestValidator.error(
    "unavailable administrator identity cannot log in",
    async () => {
      await authorize_administrator_login(
        unavailableAdministratorLoginConnection,
        {
          body: unavailableAdministratorLoginInput,
        },
      );
    },
  );
  TestValidator.equals(
    "failed administrator login does not set authorization header",
    unavailableAdministratorLoginConnection.headers?.Authorization,
    undefined,
  );
}
