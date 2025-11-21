import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test successful customer token refresh workflow.
 *
 * Validates that an active customer session can be extended by refreshing
 * authentication tokens without requiring re-authentication. The scenario tests
 * proper token validation, session continuity, and new token generation while
 * maintaining customer context and security standards.
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const createdCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://shopping-mall.example.com/register",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(createdCustomer);

  // Step 2: Establish active customer session through login
  const loggedInCustomer = await api.functional.auth.customer.login(
    connection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: undefined,
        href: "https://shopping-mall.example.com/login",
        referrer: "https://shopping-mall.example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loggedInCustomer);

  // Validate that login returned valid tokens
  TestValidator.predicate(
    "login should return valid refresh token",
    loggedInCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login should return valid access token",
    loggedInCustomer.token.access.length > 0,
  );

  // Step 3: Refresh authentication tokens using the refresh token
  const refreshedCustomer = await api.functional.auth.customer.refresh(
    connection,
    {
      body: {
        refresh_token: loggedInCustomer.token.refresh,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(refreshedCustomer);

  // Step 4: Validate refresh operation results
  TestValidator.equals(
    "customer ID should remain the same after refresh",
    refreshedCustomer.id,
    loggedInCustomer.id,
  );
  TestValidator.equals(
    "customer email should remain the same after refresh",
    refreshedCustomer.email,
    loggedInCustomer.email,
  );
  TestValidator.equals(
    "customer first name should remain the same after refresh",
    refreshedCustomer.first_name,
    loggedInCustomer.first_name,
  );
  TestValidator.equals(
    "customer last name should remain the same after refresh",
    refreshedCustomer.last_name,
    loggedInCustomer.last_name,
  );
  TestValidator.equals(
    "customer status should remain the same after refresh",
    refreshedCustomer.status,
    loggedInCustomer.status,
  );

  // Validate that new tokens were generated (different from previous ones)
  TestValidator.notEquals(
    "refresh should generate new access token",
    refreshedCustomer.token.access,
    loggedInCustomer.token.access,
  );
  TestValidator.notEquals(
    "refresh should generate new refresh token",
    refreshedCustomer.token.refresh,
    loggedInCustomer.token.refresh,
  );

  // Validate token structure integrity
  TestValidator.predicate(
    "refreshed access token should be non-empty",
    refreshedCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshedCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have expiration timestamp",
    refreshedCustomer.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have refreshable until timestamp",
    refreshedCustomer.token.refreshable_until.length > 0,
  );
}
