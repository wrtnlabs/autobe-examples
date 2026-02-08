import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_immediate_after_join(
  connection: api.IConnection,
): Promise<void> {
  // This scenario verifies that a seller can log in immediately after joining,
  // ensuring the lifecycle of authenticated sessions is properly handled.
  // 1. Seller registration (join)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallSeller.IJoin = {};
  const authorizedJoin = await authorize_seller_join(sellerJoinConnection, {
    body: joinBody,
  });
  typia.assert(authorizedJoin);
  // 2. Seller login immediately after joining
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginBody: IShoppingMallSeller.ILogin = {};
  const authorizedLogin = await authorize_seller_login(sellerLoginConnection, {
    body: loginBody,
  });
  typia.assert(authorizedLogin);
  // 3. Validate tokens and identities between join and login
  TestValidator.predicate(
    "access token is valid string",
    typeof authorizedLogin.token.access === "string" &&
      authorizedLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid string",
    typeof authorizedLogin.token.refresh === "string" &&
      authorizedLogin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiry dates are valid ISO strings",
    () =>
      !isNaN(Date.parse(authorizedLogin.token.expired_at)) &&
      !isNaN(Date.parse(authorizedLogin.token.refreshable_until)),
  );
}
