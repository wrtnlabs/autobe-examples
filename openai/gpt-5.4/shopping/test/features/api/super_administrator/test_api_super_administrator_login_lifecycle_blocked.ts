import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_lifecycle_blocked(
  connection: api.IConnection,
): Promise<void> {
  const password = typia.random<string & tags.Format<"password">>();
  const deniedPassword = `${password}!` satisfies string as string &
    tags.Format<"password">;
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const joinedConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_administrator_join(joinedConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals("joined email matches", joined.email, email);
  TestValidator.equals("joined account is active", joined.active, true);
  TestValidator.equals(
    "joined account is not deleted",
    joined.deleted_at,
    null,
  );
  const blockedAttemptConnection: api.IConnection = { host: connection.host };
  const blockedLoginBody = {
    email,
    password: deniedPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.ILogin;
  await TestValidator.error(
    "blocked lifecycle login is denied through generic authentication failure",
    async () => {
      await authorize_super_administrator_login(blockedAttemptConnection, {
        body: blockedLoginBody,
      });
    },
  );
  TestValidator.equals(
    "failed login does not establish authorization header",
    blockedAttemptConnection.headers?.Authorization,
    undefined,
  );
}
