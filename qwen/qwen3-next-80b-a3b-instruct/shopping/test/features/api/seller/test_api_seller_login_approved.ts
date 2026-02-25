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

export async function test_api_seller_login_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_seller_join(joinConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Login with approved seller account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate response structure
  TestValidator.equals("seller id matches", loginResponse.id, joinResponse.id);
  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token exists",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is date-time format", () => {
    const date = new Date(loginResponse.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is date-time format", () => {
    const date = new Date(loginResponse.token.refreshable_until);
    return !isNaN(date.getTime());
  });
}
