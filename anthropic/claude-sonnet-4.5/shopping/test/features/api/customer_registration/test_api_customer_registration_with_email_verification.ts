import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete customer registration workflow including account creation
 * with valid email, password, name, and phone number.
 *
 * This test validates that the system:
 *
 * 1. Creates a customer account with proper authentication tokens
 * 2. Returns complete customer profile information
 * 3. Validates input data matches output data
 * 4. Issues JWT access and refresh tokens with expiration information
 *
 * The customer registration process:
 *
 * - Accepts email, password (minimum 8 characters), name, and optional phone
 *   number
 * - Creates customer account (backend handles password hashing and email
 *   uniqueness)
 * - Generates JWT tokens (access token and refresh token)
 * - Returns customer profile with authentication tokens
 * - SDK automatically manages authentication headers
 */
export async function test_api_customer_registration_with_email_verification(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid customer registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  // Step 2: Call the customer registration API
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the response structure with typia (complete validation)
  typia.assert(authorizedCustomer);

  // Step 4: Verify customer data matches input (business logic validation)
  TestValidator.equals(
    "customer email matches",
    authorizedCustomer.email,
    registrationData.email,
  );
  TestValidator.equals(
    "customer name matches",
    authorizedCustomer.name,
    registrationData.name,
  );
}
