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
  // Step 1: Register a new seller account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate token fields are non-empty (typia.assert already validated format)
  TestValidator.predicate(
    "access token non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at non-empty",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until non-empty",
    loginResult.token.refreshable_until.length > 0,
  );
  // Step 4: Validate expiry times
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    loginResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    loginResult.token.refreshable_until >= loginResult.token.expired_at,
  );
  // Step 5: Validate account state flags
  TestValidator.equals("isBanned is false", loginResult.isBanned, false);
  TestValidator.equals("isSuspended is false", loginResult.isSuspended, false);
  TestValidator.equals("deletedAt is null", loginResult.deletedAt, null);
  // Step 6: Validate email and shopName match registered values
  TestValidator.equals("email matches registered", loginResult.email, email);
  TestValidator.equals(
    "shopName matches registered",
    loginResult.shopName,
    shopName,
  );
  // Step 7: Validate nested seller object mirrors top-level fields
  TestValidator.equals(
    "seller.id matches top-level id",
    loginResult.seller.id,
    loginResult.id,
  );
  TestValidator.equals(
    "seller.email matches",
    loginResult.seller.email,
    loginResult.email,
  );
  TestValidator.equals(
    "seller.shopName matches",
    loginResult.seller.shopName,
    loginResult.shopName,
  );
  TestValidator.equals(
    "seller.isBanned matches",
    loginResult.seller.isBanned,
    loginResult.isBanned,
  );
  TestValidator.equals(
    "seller.isSuspended matches",
    loginResult.seller.isSuspended,
    loginResult.isSuspended,
  );
  TestValidator.equals(
    "seller.deletedAt matches",
    loginResult.seller.deletedAt,
    loginResult.deletedAt,
  );
  // Step 8: Verify fresh token pair — login access token differs from join access token
  TestValidator.notEquals(
    "login produces fresh access token",
    loginResult.token.access,
    joinResult.token.access,
  );
}
