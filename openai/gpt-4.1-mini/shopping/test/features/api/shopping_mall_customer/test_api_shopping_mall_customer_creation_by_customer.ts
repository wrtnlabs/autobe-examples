import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the complete self-signup and customer creation process.
 *
 * This function performs the following steps:
 *
 * 1. Registers a new customer via the /auth/customer/join endpoint by sending a
 *    unique email, password, href, and referrer for session auditing.
 * 2. Validates that the join response contains an authorized customer object with
 *    a valid UUID id, matching email, and token.
 * 3. Uses the authorized customer context to create a new shopping mall customer
 *    resource via the /shoppingMall/customer/shoppingMallCustomers endpoint.
 * 4. Verifies the created customer has the expected properties: UUID id, matching
 *    email, created_at and updated_at timestamps.
 *
 * This test authenticates as a customer for subsequent API calls, simulating
 * the actual customer self-registration and verification workflow.
 */
export async function test_api_shopping_mall_customer_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer via the join API
  const uniqueEmail: string = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const password: string = "securePassword123";
  const href: string = "https://example.com/signup";
  const referrer: string = "https://example.com/";

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: uniqueEmail,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(authorizedCustomer);
  TestValidator.predicate(
    "validated authorized customer has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      authorizedCustomer.id,
    ),
  );
  TestValidator.equals(
    "authorized customer email matches input",
    authorizedCustomer.email,
    uniqueEmail,
  );
  TestValidator.predicate(
    "token object present",
    authorizedCustomer.token !== undefined && authorizedCustomer.token !== null,
  );

  // Step 2: Create a customer in shopping mall with same credentials
  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: {
          email: uniqueEmail,
          password: password,
          href: href,
          referrer: referrer,
        } satisfies IShoppingMallCustomer.ICreate,
      },
    );
  typia.assert(createdCustomer);
  TestValidator.predicate(
    "created customer has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCustomer.id,
    ),
  );
  TestValidator.equals(
    "created customer email matches input",
    createdCustomer.email,
    uniqueEmail,
  );
  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601",
    !isNaN(Date.parse(createdCustomer.created_at)) &&
      createdCustomer.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO 8601",
    !isNaN(Date.parse(createdCustomer.updated_at)) &&
      createdCustomer.updated_at.length >= 20,
  );
}
