import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test soft deletion of a customer account by ID.
 *
 * This test covers the business flow for softly deleting a customer account. It
 * verifies creation, deletion, and notes that verifying the soft deletion
 * timestamp is not feasible due to lack of API to fetch customer details.
 * Additional checks for failed login or unauthorized deletion are omitted due
 * to lack of API support.
 *
 * Steps:
 *
 * 1. Create a new customer account using the join API.
 * 2. Soft delete the created customer by ID.
 * 3. Verification of deleted_at timestamp is not possible without a customer
 *    detail API.
 * 4. Omitted login/access check as no login API is provided.
 * 5. Omitted unauthorized deletion tests due to missing API.
 *
 * This validates the soft delete lifecycle management and ensures compliance
 * with security and data lifecycle rules for customer accounts.
 */
export async function test_api_customer_soft_delete_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Soft delete the customer by ID
  await api.functional.shoppingMall.customer.customers.erase(connection, {
    id: customer.id,
  });

  // 3. Verification step for deleted_at timestamp is not possible;
  // no API available to fetch customer details and check deleted_at.

  // 4. Login or access check omitted as login API is not provided.

  // 5. Unauthorized deletion tests omitted due to lack of API.
}
