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

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email,
    password,
    href: `https://shoppingmall.example.com/admin/join/${RandomGenerator.alphabets(8)}`,
    referrer: "https://shoppingmall.example.com/admin/sign-up",
    ip: "203.0.113.10",
  } satisfies IShoppingMallAdministrator.IJoin;
  const joined: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(joinConnection, {
      body: joinBody,
    });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: `https://shoppingmall.example.com/admin/login/${RandomGenerator.alphabets(8)}`,
    referrer: "https://shoppingmall.example.com/admin/sign-in",
    ip: "203.0.113.11",
  } satisfies IShoppingMallAdministrator.ILogin;
  const authorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_login(loginConnection, {
      body: loginBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "administrator id matches registered account",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator email matches registered account",
    authorized.email,
    joined.email,
  );
  TestValidator.equals("administrator is active", authorized.active, true);
  TestValidator.equals("administrator is not banned", authorized.banned, false);
  TestValidator.equals(
    "administrator is not deleted",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    authorized.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    authorized.token.access,
    authorized.token.refresh,
  );
}
