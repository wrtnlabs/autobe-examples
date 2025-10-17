import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test customer account creation and session management API structure.
 *
 * This test validates the customer registration flow and verifies that the
 * session revocation API endpoint is properly structured and accessible. Due to
 * API limitations (no session listing endpoint available), this test focuses on
 * validating the registration process and the session revocation API's ability
 * to handle requests with proper authentication.
 *
 * Steps:
 *
 * 1. Create a new customer account with valid registration data
 * 2. Verify the customer account is created successfully
 * 3. Validate that authentication tokens are properly issued
 * 4. Test session revocation API with generated session identifier
 */
export async function test_api_customer_session_remote_revocation_for_security(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account and establish authenticated session
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });

  typia.assert(authorizedCustomer);

  // Step 2: Verify customer account properties
  TestValidator.predicate(
    "customer ID should be valid UUID",
    typeof authorizedCustomer.id === "string" &&
      authorizedCustomer.id.length > 0,
  );

  TestValidator.predicate(
    "customer email should match registration email",
    authorizedCustomer.email === customerData.email,
  );

  TestValidator.predicate(
    "customer name should match registration name",
    authorizedCustomer.name === customerData.name,
  );

  // Step 3: Verify authentication token structure
  typia.assert(authorizedCustomer.token);

  TestValidator.predicate(
    "access token should be present",
    typeof authorizedCustomer.token.access === "string" &&
      authorizedCustomer.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    typeof authorizedCustomer.token.refresh === "string" &&
      authorizedCustomer.token.refresh.length > 0,
  );

  // Step 4: Test session revocation API endpoint
  // Note: Without a session listing API, we use a generated UUID to test the endpoint structure
  // In a real scenario, this would be an actual session ID from the backend
  const customerId: string & tags.Format<"uuid"> = authorizedCustomer.id;
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.customer.customers.sessions.erase(
    connection,
    {
      customerId: customerId,
      sessionId: sessionId,
    },
  );
}
