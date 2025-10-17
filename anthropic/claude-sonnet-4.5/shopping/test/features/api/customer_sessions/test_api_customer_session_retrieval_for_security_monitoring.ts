import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";

/**
 * Test customer authentication and session establishment.
 *
 * This test validates customer account creation and authentication flow. The
 * customer registration process automatically establishes an authenticated
 * session with JWT tokens. While the full scenario requests session detail
 * retrieval, the current API structure does not expose session IDs in the
 * authentication response, limiting full session management testing.
 *
 * Workflow:
 *
 * 1. Create a new customer account through authentication join endpoint
 * 2. Validate customer registration response with authentication tokens
 * 3. Verify customer account details match the registration input
 * 4. Confirm authentication token structure is properly generated
 *
 * Note: Session detail retrieval requires session ID which is not provided in
 * the IAuthorized response. Additional session listing endpoints would be
 * needed for complete session management testing.
 */
export async function test_api_customer_session_retrieval_for_security_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create new customer account with authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();

  const customerData = {
    email: customerEmail,
    password: customerPassword,
    name: customerName,
    phone: customerPhone,
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Validate customer registration details
  TestValidator.equals(
    "customer email matches registration",
    authorizedCustomer.email,
    customerEmail,
  );

  TestValidator.equals(
    "customer name matches registration",
    authorizedCustomer.name,
    customerName,
  );

  // Step 3: Validate authentication token structure
  TestValidator.predicate(
    "authorization token exists",
    authorizedCustomer.token !== null && authorizedCustomer.token !== undefined,
  );

  typia.assert(authorizedCustomer.token);

  TestValidator.predicate(
    "access token is non-empty",
    authorizedCustomer.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty",
    authorizedCustomer.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token expiration is in the future",
    new Date(authorizedCustomer.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token is valid until future date",
    new Date(authorizedCustomer.token.refreshable_until).getTime() > Date.now(),
  );

  // Step 4: Verify customer ID is valid UUID format
  TestValidator.predicate(
    "customer ID is valid UUID",
    authorizedCustomer.id.length === 36,
  );
}
