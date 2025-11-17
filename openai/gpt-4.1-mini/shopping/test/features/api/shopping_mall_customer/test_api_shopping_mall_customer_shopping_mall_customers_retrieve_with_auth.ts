import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * This function tests the complete workflow for a Shopping Mall Customer.
 *
 * It covers three main steps:
 *
 * 1. Register a new customer account using the /auth/customer/join endpoint.
 * 2. Create a new shopping mall customer resource using the authenticated token.
 * 3. Retrieve the created shopping mall customer by ID to verify data integrity.
 *
 * The test ensures that the authorization token is properly issued, that the
 * customer creation reflects the input email, and that the retrieved customer
 * matches the created one both in ID and email.
 *
 * This validates the authentication, protected resource creation, and retrieval
 * aspects of the customer management API.
 *
 * @param connection The connection interface used for API calls with
 *   authentication context.
 */
export async function test_api_shopping_mall_customer_shopping_mall_customers_retrieve_with_auth(
  connection: api.IConnection,
) {
  // Step 1: Register new customer account via /auth/customer/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: `https://example.com/signup`,
    referrer: `https://example.com`,
  } satisfies IShoppingMallCustomer.ICreate;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });

  typia.assert(authorized);
  TestValidator.predicate(
    "authorization token is defined",
    authorized.token !== null && authorized.token !== undefined,
  );

  // Step 2: Create a shopping mall customer resource
  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(createdCustomer);

  TestValidator.equals(
    "created customer email matches",
    createdCustomer.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "created customer id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdCustomer.id,
    ),
  );

  // Step 3: Retrieve the customer by id
  const retrievedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.at(
      connection,
      {
        shoppingMallCustomerId: createdCustomer.id,
      },
    );
  typia.assert(retrievedCustomer);

  TestValidator.equals(
    "retrieved customer id matches created id",
    retrievedCustomer.id,
    createdCustomer.id,
  );
  TestValidator.equals(
    "retrieved customer email matches created email",
    retrievedCustomer.email,
    createdCustomer.email,
  );
}
