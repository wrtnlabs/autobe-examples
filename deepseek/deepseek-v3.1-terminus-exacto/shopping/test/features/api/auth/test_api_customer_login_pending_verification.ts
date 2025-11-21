import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer login with account in 'pending_verification' status to validate
 * proper account status handling. Ensures customers with unverified accounts
 * receive appropriate authentication tokens while maintaining
 * 'pending_verification' status until email verification is completed.
 */
export async function test_api_customer_login_pending_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a customer account with pending verification status
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const createdCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.example.com/register",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(createdCustomer);

  // Verify the account was created with 'pending_verification' status
  TestValidator.equals(
    "new account should have pending_verification status",
    createdCustomer.status,
    "pending_verification",
  );

  // Step 2: Attempt to log in with the pending verification account
  const loginResponse = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shopping-mall.example.com/login",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate login response contains correct customer information
  TestValidator.equals(
    "login response email should match created account email",
    loginResponse.email,
    customerEmail,
  );

  TestValidator.equals(
    "login response first name should match created account first name",
    loginResponse.first_name,
    createdCustomer.first_name,
  );

  TestValidator.equals(
    "login response last name should match created account last name",
    loginResponse.last_name,
    createdCustomer.last_name,
  );

  TestValidator.equals(
    "login response status should remain pending_verification",
    loginResponse.status,
    "pending_verification",
  );

  // Step 4: Validate authentication tokens are properly generated
  TestValidator.predicate(
    "access token should be generated and non-empty",
    loginResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be generated and non-empty",
    loginResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expiration timestamp should be in the future",
    new Date(loginResponse.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refreshable until timestamp should be in the future",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  // Step 5: Verify account creation and update timestamps are valid
  TestValidator.predicate(
    "created_at timestamp should be valid and not in the future",
    new Date(createdCustomer.created_at) <= new Date(),
  );

  TestValidator.predicate(
    "updated_at timestamp should be valid and not in the future",
    new Date(createdCustomer.updated_at) <= new Date(),
  );

  // Additional validation: Ensure the login response contains all required fields
  TestValidator.predicate(
    "login response should contain customer ID",
    loginResponse.id.length > 0,
  );

  TestValidator.predicate(
    "customer ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
}
