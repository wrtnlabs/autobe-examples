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

export async function test_api_seller_login_approved_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with join endpoint
  const sellerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shopName: RandomGenerator.name(),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Verify join response has valid tokens
  TestValidator.predicate(
    "join returns access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "join returns refresh token",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.equals("email matches", joinResult.email, email);
  TestValidator.predicate("suspended is false", joinResult.suspended === false);
  TestValidator.predicate("banned is false", joinResult.banned === false);
  // 3. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  // 4. Verify login response structure
  TestValidator.equals(
    "login returns same seller id",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals("login returns same email", loginResult.email, email);
  TestValidator.equals(
    "login returns same shop_name",
    loginResult.shop_name,
    joinResult.shop_name,
  );
  TestValidator.predicate(
    "login returns access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login expired_at is valid date",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "login refreshable_until is valid date",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
  // 5. Verify account status fields
  TestValidator.predicate(
    "approval_status is set",
    loginResult.approval_status !== null &&
      loginResult.approval_status !== undefined,
  );
  TestValidator.equals("suspended remains false", loginResult.suspended, false);
  TestValidator.equals("banned remains false", loginResult.banned, false);
}
