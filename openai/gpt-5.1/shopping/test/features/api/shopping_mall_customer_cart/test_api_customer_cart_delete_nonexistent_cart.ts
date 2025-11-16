import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * E2E test: deleting a non-existent customer cart must fail safely without
 * affecting existing carts.
 *
 * Business context:
 *
 * - Customers use persistent carts stored in shopping_mall_customer_carts.
 * - Deleting a cart uses DELETE
 *   /shoppingMall/customer/customerCarts/{customerCartId}.
 * - When a customer attempts to delete a cart that does not exist (or does not
 *   belong to them), the platform must return an error and must not impact
 *   other valid carts.
 *
 * Scenario steps:
 *
 * 1. Join as a new customer using /auth/customer/join to obtain an authenticated
 *    session (SDK auto-sets Authorization header).
 * 2. Create a baseline cart via /shoppingMall/customer/customerCarts (create) for
 *    the authenticated customer to prove a valid cart exists.
 * 3. Generate a random UUID for a non-existent customerCartId that differs from
 *    the real cart id.
 * 4. Call erase(customerCartId) using this non-existent id and verify that the
 *    operation fails by asserting that an error is thrown.
 * 5. Create another cart after the failed deletion to ensure the customer is still
 *    authorized and cart creation still works, which strongly suggests that the
 *    failed deletion did not corrupt the cart subsystem.
 */
export async function test_api_customer_cart_delete_nonexistent_cart(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    // ip is optional and nullable; we can omit it entirely to let backend infer
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a baseline cart for this customer
  const baseCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    is_active: true,
    metadata: {
      scenario: "delete-nonexistent-cart-baseline",
    },
  } satisfies IShoppingMallCustomerCart.ICreate;

  const baseCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: baseCartBody,
      },
    );
  typia.assert(baseCart);

  // 3. Construct a non-existent cart ID different from the real one
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentId === baseCart.id) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Attempt to delete the non-existent cart and expect an error
  await TestValidator.error(
    "deleting non-existent customer cart must fail",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.erase(
        connection,
        {
          customerCartId: nonexistentId,
        },
      );
    },
  );

  // 5. Verify that existing carts and customer session remain usable
  const followupCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    is_active: true,
    metadata: {
      scenario: "delete-nonexistent-cart-followup",
    },
  } satisfies IShoppingMallCustomerCart.ICreate;

  const followupCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: followupCartBody,
      },
    );
  typia.assert(followupCart);

  // Basic sanity checks to ensure the carts belong to the same customer and
  // remain consistent at a high level.
  TestValidator.equals(
    "both carts must belong to the same customer",
    baseCart.customer.id,
    followupCart.customer.id,
  );
  TestValidator.equals(
    "followup cart currency matches baseline",
    baseCart.currency_code,
    followupCart.currency_code,
  );
  TestValidator.equals(
    "followup cart region matches baseline",
    baseCart.region_code,
    followupCart.region_code,
  );
}
