import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test successful JWT token refresh for a logged-in customer.
 *
 * This test covers the full lifecycle of token refreshing for a newly
 * registered customer user. It verifies that after customer registration, the
 * refresh token can be used to obtain new JWT tokens successfully. It also
 * validates error responses to invalid refresh token values.
 *
 * Steps:
 *
 * 1. Register a new customer user via /auth/customer/join.
 * 2. Extract the refresh token from the authorized customer response.
 * 3. Use the refresh token to call /auth/customer/refresh and obtain new tokens.
 * 4. Verify the refreshed token response.
 * 5. Attempt refresh with invalid tokens and verify failure responses.
 */
export async function test_api_customer_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const newCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: newCustomerBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Extract the refresh token
  const initialRefreshToken: string = authorizedCustomer.token.refresh;

  // Step 3: Refresh JWT tokens using the refresh token
  const refreshBody = {
    refresh_token: initialRefreshToken,
  } satisfies IShoppingMallCustomer.IRefresh;

  const refreshedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedCustomer);

  // Step 4: Validate refreshed tokens are different from initial tokens
  TestValidator.predicate(
    "refresh token should be updated",
    authorizedCustomer.token.refresh !== refreshedCustomer.token.refresh,
  );
  TestValidator.predicate(
    "access token should be updated",
    authorizedCustomer.token.access !== refreshedCustomer.token.access,
  );

  // Step 5: Test invalid refresh tokens
  await TestValidator.error("refresh token null should fail", async () => {
    await api.functional.auth.customer.refresh(connection, {
      body: { refresh_token: "" } satisfies IShoppingMallCustomer.IRefresh,
    });
  });

  await TestValidator.error("refresh token invalid should fail", async () => {
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refresh_token: "invalid-token",
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  });
}
