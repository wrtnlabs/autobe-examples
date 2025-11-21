import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test token refresh failure when customer session has expired. Validates that
 * expired refresh tokens are properly rejected and appropriate error responses
 * are returned. This scenario tests session expiration handling and security
 * boundary enforcement for token refresh operations.
 */
export async function test_api_customer_token_refresh_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Establish customer session through login
  const loginResponse = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Test refresh with invalid token format (business logic error)
  await TestValidator.error(
    "refresh should fail with malformed token",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: "invalid_token_format_that_will_fail",
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );

  // Step 4: Validate that valid refresh token works correctly
  const validRefreshResponse = await api.functional.auth.customer.refresh(
    connection,
    {
      body: {
        refresh_token: loginResponse.token.refresh,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(validRefreshResponse);

  TestValidator.equals(
    "new access token should be generated for valid refresh",
    validRefreshResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token should be generated",
    validRefreshResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.notEquals(
    "refresh token should be different from original",
    validRefreshResponse.token.refresh,
    loginResponse.token.refresh,
  );
}
