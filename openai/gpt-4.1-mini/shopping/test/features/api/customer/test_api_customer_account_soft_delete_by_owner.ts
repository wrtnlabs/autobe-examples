import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates that a customer can soft delete their own account.
 *
 * This test covers the full workflow:
 *
 * 1. New customer registers through authentication join endpoint.
 * 2. A corresponding shopping mall customer account is created.
 * 3. The customer then performs a soft delete on their own account using the erase
 *    endpoint.
 *
 * It verifies that the erase operation responds correctly (204 No Content) and
 * that no errors occur. This confirms authorization and soft delete logic
 * function as intended.
 */
export async function test_api_customer_account_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer via auth.customer.join to create authenticated user context
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: `user.${typia.random<string & tags.Format<"email">>()}`,
        password: "Password123!",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerAuthorized);

  // 2. Create a shopping mall customer account using authorized user's data
  const customerCreateBody = {
    email: customerAuthorized.email,
    password_hash: customerAuthorized.password_hash,
    nickname: customerAuthorized.nickname ?? null,
    phone_number: customerAuthorized.phone_number ?? null,
    status: customerAuthorized.status,
  } satisfies IShoppingMallCustomer.ICreate;

  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(createdCustomer);

  // 3. Soft delete the created customer account by ID
  await api.functional.shoppingMall.customer.customers.erase(connection, {
    id: createdCustomer.id,
  });

  // 4. No exception means success. Erase returns void with HTTP 204 No Content.
}
