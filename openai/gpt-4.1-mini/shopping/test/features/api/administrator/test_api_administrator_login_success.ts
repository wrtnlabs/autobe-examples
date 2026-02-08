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
  // Test scenario for administrator login success.
  // 1. Administrator joins the platform with empty body (per empty IJoin DTO).
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const joinResult = await authorize_administrator_join(adminJoinConnection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  // 2. Administrator logs in with empty body (per empty ILogin DTO).
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginBody: IShoppingMallAdministrator.ILogin = {};
  const loginResult = await authorize_administrator_login(
    adminLoginConnection,
    { body: loginBody },
  );
  typia.assert(loginResult);
  // Validate tokens in login result
  const token = loginResult.token;
  typia.assert<IAuthorizationToken>(token);
  // Validate access token and refresh token are non-empty strings
  TestValidator.predicate(
    "access token nonempty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token nonempty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Validate expired_at and refreshable_until are valid ISO 8601 date-time strings
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate("expired_at valid date", !isNaN(expiredAt.getTime()));
  TestValidator.predicate(
    "refreshable_until valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  // Validate expired_at < refreshable_until
  TestValidator.predicate(
    "expired_at < refreshable_until",
    expiredAt < refreshableUntil,
  );
}
