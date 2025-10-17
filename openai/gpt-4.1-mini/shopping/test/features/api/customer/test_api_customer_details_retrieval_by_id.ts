import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the retrieval of customer details by ID.
 *
 * This test covers customer registration via the join endpoint, followed by
 * retrieving detailed customer information using the customer ID. It validates
 * that the customer details retrieved match the registered customer's
 * information.
 *
 * Additionally, it verifies access control by ensuring that only authorized
 * customers can fetch such details.
 *
 * Step-by-step:
 *
 * 1. Register a customer using api.functional.auth.customer.join
 * 2. Fetch customer details by ID using
 *    api.functional.shoppingMall.customer.customers.at
 * 3. Assert correctness of retrieved data
 * 4. Test unauthorized access denial by using connection without valid token
 */
export async function test_api_customer_details_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // Extract token and id
  const customerId: string & tags.Format<"uuid"> = authorizedCustomer.id;

  // Step 2: Retrieve the customer by ID
  const customerDetails: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.at(connection, {
      id: customerId,
    });
  typia.assert(customerDetails);

  // Step 3: Validate that retrieved details match authorized customer
  TestValidator.equals(
    "Customer ID matches",
    customerDetails.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "Customer email matches",
    customerDetails.email,
    authorizedCustomer.email,
  );
  TestValidator.equals(
    "Customer nickname matches",
    customerDetails.nickname,
    authorizedCustomer.nickname,
  );
  TestValidator.equals(
    "Customer phone number matches",
    customerDetails.phone_number,
    authorizedCustomer.phone_number,
  );
  TestValidator.equals(
    "Customer status matches",
    customerDetails.status,
    authorizedCustomer.status,
  );
  TestValidator.equals(
    "Customer created_at matches",
    customerDetails.created_at,
    authorizedCustomer.created_at,
  );
  TestValidator.equals(
    "Customer updated_at matches",
    customerDetails.updated_at,
    authorizedCustomer.updated_at,
  );
  // deleted_at may be null or undefined, use equals for safety
  TestValidator.equals(
    "Customer deleted_at matches",
    customerDetails.deleted_at ?? null,
    authorizedCustomer.deleted_at ?? null,
  );

  // Step 4: Test access control by making retrieval with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // Reset headers to remove auth token
  };

  await TestValidator.error(
    "Unauthenticated users cannot retrieve customer details",
    async () => {
      await api.functional.shoppingMall.customer.customers.at(
        unauthenticatedConnection,
        {
          id: customerId,
        },
      );
    },
  );
}
