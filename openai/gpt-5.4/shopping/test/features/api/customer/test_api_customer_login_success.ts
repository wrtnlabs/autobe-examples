import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const joinedConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(joinedConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined email matches input",
    joined.email,
    joinBody.email,
  );
  TestValidator.equals("joined account is not banned", joined.banned_at, null);
  TestValidator.equals(
    "joined account is not deleted",
    joined.deleted_at,
    null,
  );
  TestValidator.predicate(
    "joined access token exists",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined refresh token exists",
    joined.token.refresh.length > 0,
  );
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_customer_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "logged in customer id matches joined customer",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "logged in email matches joined customer",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "logged in account is not banned",
    loggedIn.banned_at,
    null,
  );
  TestValidator.equals(
    "logged in account is not deleted",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.equals(
    "customer created_at remains stable across sessions",
    loggedIn.created_at,
    joined.created_at,
  );
  TestValidator.notEquals(
    "login access token is newly issued",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "login refresh token is newly issued",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "token refreshability lasts at least until access expiry",
    Date.parse(loggedIn.token.expired_at) <=
      Date.parse(loggedIn.token.refreshable_until),
  );
}
