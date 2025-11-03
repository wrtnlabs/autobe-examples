import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_token_refresh_with_join_dependency(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account to obtain initial JWT tokens
  const createBody = {
    email: `seller_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "strong_password_123",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: createBody,
    });
  typia.assert(sellerAuthorized);

  TestValidator.predicate(
    "seller authorized has access token",
    typeof sellerAuthorized.token.access === "string" &&
      sellerAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "seller authorized has refresh token",
    typeof sellerAuthorized.token.refresh === "string" &&
      sellerAuthorized.token.refresh.length > 0,
  );

  // Step 2: Use the refresh endpoint with the obtained refresh token
  const refreshBody = {
    refreshToken: sellerAuthorized.token.refresh,
  } satisfies IShoppingMallSeller.IRefresh;

  const refreshedAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuthorized);

  TestValidator.predicate(
    "refreshed authorized has new access token",
    typeof refreshedAuthorized.token.access === "string" &&
      refreshedAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed authorized has new refresh token",
    typeof refreshedAuthorized.token.refresh === "string" &&
      refreshedAuthorized.token.refresh.length > 0,
  );

  // Tokens before and after refresh should be different
  TestValidator.notEquals(
    "access token is refreshed",
    sellerAuthorized.token.access,
    refreshedAuthorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token is refreshed",
    sellerAuthorized.token.refresh,
    refreshedAuthorized.token.refresh,
  );
}
