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
  const administratorConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdministrator.IJoin;
  const joined = await authorize_administrator_join(administratorConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email: joinBody.email,
      password: joinBody.password,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "administrator email should match login input",
    loggedIn.email,
    joinBody.email,
  );
  TestValidator.equals(
    "administrator id should match between join and login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "administrator grade should match between join and login",
    loggedIn.grade,
    joined.grade,
  );
  TestValidator.equals(
    "administrator account status should match between join and login",
    loggedIn.accountStatus,
    joined.accountStatus,
  );
  TestValidator.predicate(
    "access token should be issued",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be set",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh deadline should be set",
    loggedIn.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "administrator login should not expose password details",
    !Object.prototype.hasOwnProperty.call(loggedIn, "password"),
  );
  TestValidator.predicate(
    "administrator login should not expose password hash details",
    !Object.prototype.hasOwnProperty.call(loggedIn, "passwordHash"),
  );
}
