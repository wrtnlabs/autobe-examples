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

export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const joined = await authorize_super_administrator_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "join email matches input",
    joined.email,
    joinBody.email,
  );
  TestValidator.equals("joined account is active", joined.active, true);
  TestValidator.equals(
    "joined account is not deleted",
    joined.deleted_at,
    null,
  );
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.ILogin;
  const loggedIn = await authorize_super_administrator_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login returns same account id", loggedIn.id, joined.id);
  TestValidator.equals(
    "login email matches input",
    loggedIn.email,
    joinBody.email,
  );
  TestValidator.equals("login account remains active", loggedIn.active, true);
  TestValidator.equals(
    "login account is not deleted",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "login issues a fresh access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "login issues a fresh refresh token",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.notEquals(
    "login issues a fresh access expiration",
    loggedIn.token.expired_at,
    joined.token.expired_at,
  );
  TestValidator.notEquals(
    "login issues a fresh refreshable deadline",
    loggedIn.token.refreshable_until,
    joined.token.refreshable_until,
  );
}
