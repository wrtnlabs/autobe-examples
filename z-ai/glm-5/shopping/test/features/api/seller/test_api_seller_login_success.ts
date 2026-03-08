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

/**
 * Test successful seller login with valid credentials.
 *
 * This test validates the seller login workflow:
 * 1. Register a new seller account
 * 2. Login with the registered credentials
 * 3. Verify the response contains valid authentication tokens
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account via join endpoint
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(joinResult);
  // 2. Test login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate authentication tokens
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  // 4. Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid ISO datetime",
    new Date(loginResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO datetime",
    new Date(loginResult.token.refreshable_until).getTime() > 0,
  );
  // 5. Validate seller profile information
  TestValidator.equals("email matches", loginResult.email, sellerEmail);
  TestValidator.predicate("id is valid UUID", loginResult.id.length > 0);
  TestValidator.predicate(
    "shopName is non-empty",
    loginResult.shopName.length > 0,
  );
  // 6. Validate account status for newly registered seller
  TestValidator.equals(
    "approval_status is pending",
    loginResult.approval_status,
    "pending",
  );
  TestValidator.equals("suspended is false", loginResult.suspended, false);
  TestValidator.equals("banned is false", loginResult.banned, false);
}
