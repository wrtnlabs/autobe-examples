import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Validate that an authenticated customer can delete their own active cart.
 *
 * Business context:
 *
 * - Customers register themselves via the auth join endpoint, which also returns
 *   an authorization envelope and binds an access token onto the connection
 *   headers.
 * - Authenticated customers can create persistent carts using
 *   /shoppingMall/customer/customerCarts, which are stored as
 *   shopping_mall_customer_carts rows.
 * - Customers should be able to delete their own carts using the DELETE
 *   /shoppingMall/customer/customerCarts/{customerCartId} endpoint.
 *
 * This test exercises the happy path plus a simple negative case:
 *
 * 1. Register a fresh customer via auth.customer.join to establish an
 *    authenticated context.
 * 2. Create a new active customer cart using shoppingMall.customer
 *    .customerCarts.create with an IShoppingMallCustomerCart.ICreate body.
 * 3. Assert the created cart structure and its linkage to the authorized customer
 *    identity.
 * 4. Delete the cart using shoppingMall.customer.customerCarts.erase with the
 *    cart.id as customerCartId.
 * 5. Confirm the deletion call succeeds (no error is thrown).
 * 6. Attempt to delete the same cart again and assert that an error is thrown,
 *    demonstrating that the cart is no longer deletable.
 */
export async function test_api_customer_cart_delete_own_active_cart(
  connection: api.IConnection,
) {
  // 1. Register a fresh customer and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new active customer cart for this customer
  const createCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
      scenario: "delete-own-cart",
    },
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(createdCart);

  // 3. Validate that the created cart is linked to the authorized customer
  TestValidator.equals(
    "cart customer id should match authorized customer id",
    createdCart.customer.id,
    authorizedCustomer.id,
  );

  // And that it is active
  TestValidator.predicate(
    "created cart should be active",
    createdCart.is_active === true,
  );

  // 4. Delete the cart using its id
  await api.functional.shoppingMall.customer.customerCarts.erase(connection, {
    customerCartId: createdCart.id,
  });

  // 5. Re-deleting the same cart should result in an error
  await TestValidator.error(
    "deleting an already deleted cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.erase(
        connection,
        {
          customerCartId: createdCart.id,
        },
      );
    },
  );
}
