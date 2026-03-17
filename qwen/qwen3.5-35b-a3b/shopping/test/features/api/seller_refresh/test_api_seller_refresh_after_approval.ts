import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login to obtain initial JWT tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Extract refresh token for refresh operation
  const refreshToken = loginResult.token.refresh;
  // 4. Refresh the access token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate token structure
  TestValidator.equals("seller ID matches", refreshResult.id, joinResult.id);
  TestValidator.equals("email matches", refreshResult.email, joinResult.email);
  // 6. Validate tokens are different (new tokens issued)
  TestValidator.notEquals(
    "access token different",
    loginResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token different",
    loginResult.token.refresh,
    refreshResult.token.refresh,
  );
  // 7. Validate expiration metadata order
  const accessExpires = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "access expires before refreshable_until",
    accessExpires.getTime() < refreshableUntil.getTime(),
  );
  // 8. Validate dates are in future
  const now = new Date();
  TestValidator.predicate(
    "access token not yet expired",
    accessExpires.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil.getTime() > now.getTime(),
  );
}
