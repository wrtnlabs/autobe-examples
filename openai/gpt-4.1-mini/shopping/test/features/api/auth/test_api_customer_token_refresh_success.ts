import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the flow of refreshing JWT tokens for an authenticated customer user.
 *
 * Steps:
 *
 * 1. Create a new customer account by invoking the join operation to obtain
 *    authentication tokens.
 * 2. Use the refresh token from the initial authentication to request new access
 *    and refresh tokens.
 * 3. Validate that the response contains new valid tokens and that the refresh
 *    token is correctly accepted.
 * 4. Negative scenarios such as expired or invalid refresh tokens cannot be tested
 *    due to limitations but would normally be included.
 *
 * Purpose is to ensure session continuity is maintained through token refresh
 * without requiring the user to login again.
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Create a new customer account
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies IShoppingMallCustomer.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(customerAuthorized);

  // 2. Use the received refresh token to request new tokens
  const refreshBody = {
    refreshToken: customerAuthorized.token.refresh,
  } satisfies IShoppingMallCustomer.IRefresh;

  const refreshedAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedAuthorized);

  // 3. Validate the new tokens are different and non-empty
  TestValidator.predicate(
    "refresh token access token is a non-empty string",
    typeof refreshedAuthorized.token.access === "string" &&
      refreshedAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token refresh token is a non-empty string",
    typeof refreshedAuthorized.token.refresh === "string" &&
      refreshedAuthorized.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access tokens should be different after refresh",
    customerAuthorized.token.access,
    refreshedAuthorized.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens should be different after refresh",
    customerAuthorized.token.refresh,
    refreshedAuthorized.token.refresh,
  );

  // 4. Validate user id and email are the same (user identity preserved)
  TestValidator.equals(
    "user id should be the same after token refresh",
    refreshedAuthorized.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "user email should be the same after token refresh",
    refreshedAuthorized.email,
    customerAuthorized.email,
  );
}
