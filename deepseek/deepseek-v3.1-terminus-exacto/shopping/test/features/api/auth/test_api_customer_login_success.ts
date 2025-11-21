import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test successful customer login workflow with valid credentials.
 *
 * This test validates the complete authentication flow by first creating a
 * customer account and then testing login with the same credentials. It ensures
 * that bcrypt password comparison works correctly, session records are created
 * with connection context, and proper authentication tokens are returned for
 * platform access.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for login testing
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/auth/login",
      referrer: "https://example.com/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Test successful login with valid credentials
  const loginResult = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/dashboard",
      referrer: "https://example.com/auth/login",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Validate login response structure
  TestValidator.equals("customer ID should match", loginResult.id, customer.id);
  TestValidator.equals("email should match", loginResult.email, customerEmail);
  TestValidator.equals(
    "first name should match",
    loginResult.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "last name should match",
    loginResult.last_name,
    customer.last_name,
  );
  TestValidator.equals(
    "phone number should match",
    loginResult.phone_number,
    customer.phone_number,
  );
  TestValidator.equals("status should be active", loginResult.status, "active");

  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token should be present",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be valid date",
    !isNaN(new Date(loginResult.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refresh token expiration should be valid date",
    !isNaN(new Date(loginResult.token.refreshable_until).getTime()),
  );

  // Step 5: Validate token expiration logic
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshableUntil > expiredAt,
  );
}
