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
  // Generate random credentials for registration and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Create seller connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register seller account with credentials
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: email,
      password: password,
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create new connection for login (separate from registration connection)
  const loginConnection: api.IConnection = { host: connection.host };
  // Perform seller login with valid credentials
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // Validate JWT token structure
  TestValidator.predicate(
    "has access token",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    () => loginResult.token.refresh.length > 0,
  );
  // Validate expiration timestamps are in ISO 8601 date-time format
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => {
      const date = loginResult.token.expired_at;
      return !isNaN(new Date(date).getTime()) &&
        date.includes("T") &&
        date.endsWith("Z");
    },
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => {
      const date = loginResult.token.refreshable_until;
      return !isNaN(new Date(date).getTime()) &&
        date.includes("T") &&
        date.endsWith("Z");
    },
  );
  // Validate token expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(loginResult.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => new Date(loginResult.token.refreshable_until) > now,
  );
}