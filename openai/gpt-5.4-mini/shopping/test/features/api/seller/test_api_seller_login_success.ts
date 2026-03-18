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

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>() as string &
      tags.MinLength<1> &
      tags.Format<"password">,
  } satisfies IShoppingMallSeller.IJoin;
  const joined = await authorize_seller_join(sellerJoinConnection, {
    body: sellerCredentials,
  });
  typia.assert(joined);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerCredentials.email,
      password: sellerCredentials.password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "seller email should match login input",
    loggedIn.email,
    sellerCredentials.email,
  );
  TestValidator.equals(
    "seller id should remain the same",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "seller approval status should be stable",
    loggedIn.approvalStatus,
    joined.approvalStatus,
  );
  TestValidator.equals(
    "seller account status should be stable",
    loggedIn.accountStatus,
    joined.accountStatus,
  );
  TestValidator.predicate(
    "authorization access token should be issued",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization refresh token should be issued",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be provided",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration should be provided",
    loggedIn.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "authenticated session payload should be usable",
    loggedIn.token.access !== loggedIn.token.refresh,
  );
}
