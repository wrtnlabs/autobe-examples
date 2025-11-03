import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_login_with_join_dependency(
  connection: api.IConnection,
) {
  // 1. Generate seller registration data for join
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  // 2. Call join endpoint to create seller account
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(authorizedSeller);

  // 3. Prepare login payload using registered email and same password
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallSeller.ILogin;

  // 4. Call login endpoint with valid credentials
  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loggedInSeller);

  // 5. Validate that login returns a valid JWT token and authorized seller info
  TestValidator.predicate(
    "login returns access token",
    typeof loggedInSeller.token.access === "string" &&
      loggedInSeller.token.access.length > 0,
  );
  TestValidator.equals(
    "login user email matches join email",
    loggedInSeller.email,
    authorizedSeller.email,
  );
  TestValidator.equals(
    "login user store_name matches join store_name",
    loggedInSeller.store_name,
    authorizedSeller.store_name,
  );

  // 6. Validate token expiration timestamps
  TestValidator.predicate(
    "login token expired_at is valid ISO string",
    typeof loggedInSeller.token.expired_at === "string" &&
      loggedInSeller.token.expired_at.length > 10,
  );
  TestValidator.predicate(
    "login token refreshable_until is valid ISO string",
    typeof loggedInSeller.token.refreshable_until === "string" &&
      loggedInSeller.token.refreshable_until.length > 10,
  );
}
