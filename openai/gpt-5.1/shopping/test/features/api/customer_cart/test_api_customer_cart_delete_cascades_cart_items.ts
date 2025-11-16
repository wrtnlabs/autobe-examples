import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Ensure that deleting a customer cart cascades to its cart items.
 *
 * Business intent:
 *
 * - A persistent customer cart can have multiple cart items. When the cart is
 *   deleted by its owning customer, all associated cart items in
 *   shopping_mall_customer_cart_items must also be removed, so that there are
 *   no orphaned items and no stale data visible in cart item queries.
 *
 * Scenario steps:
 *
 * 1. Join a customer using POST /auth/customer/join which also authenticates the
 *    connection (token is set on connection.headers by SDK).
 * 2. Create a new persistent customer cart with POST
 *    /shoppingMall/customer/customerCarts.
 * 3. Create a cart item in that cart with POST
 *    /shoppingMall/customer/customerCarts/{customerCartId}/items using a random
 *    SKU UUID and quantity.
 * 4. List items for the cart with PATCH
 *    /shoppingMall/customer/customerCarts/{customerCartId}/items and verify at
 *    least one item exists and includes the created item ID.
 * 5. Delete the cart with DELETE
 *    /shoppingMall/customer/customerCarts/{customerCartId} and assert the call
 *    completes without error.
 * 6. List items again for the same cart ID. If the request succeeds, assert that
 *    the page's data array is empty, which proves no live items remain
 *    associated with this cart. Do not assert on HTTP status code.
 * 7. Call GET
 *    /shoppingMall/customer/customerCarts/{customerCartId}/items/{customerCartItemId}
 *    for the previously created item ID wrapped in TestValidator.error, to
 *    ensure that some error occurs when trying to access a child item of a
 *    deleted cart, without asserting any particular HTTP status or error
 *    message.
 */
export async function test_api_customer_cart_delete_cascades_cart_items(
  connection: api.IConnection,
) {
  // 1. Customer joins and gets authorized
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a persistent customer cart for this customer
  const createCartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(cart);

  // 3. Create a cart item in the cart
  const createItemBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    note: "seed item for cascade delete test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const item: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: createItemBody,
      },
    );
  typia.assert(item);

  // 4. List items for the cart and ensure the created item is present
  const firstIndexBody = {
    page: 0,
    limit: 10,
    sku_code: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  const firstPage: IPageIShoppingMallCustomerCartItem.ISummary =
    await api.functional.shoppingMall.customer.customerCarts.items.index(
      connection,
      {
        customerCartId: cart.id,
        body: firstIndexBody,
      },
    );
  typia.assert(firstPage);

  TestValidator.predicate(
    "cart items list should contain at least one item before deletion",
    firstPage.data.length > 0,
  );

  const hasCreated = firstPage.data.some((summary) => summary.id === item.id);
  TestValidator.predicate(
    "cart items list should include the created item before deletion",
    hasCreated,
  );

  // 5. Delete the cart
  await api.functional.shoppingMall.customer.customerCarts.erase(connection, {
    customerCartId: cart.id,
  });

  // 6. List items again; if it succeeds, assert that no items remain
  const secondIndexBody = {
    page: 0,
    limit: 10,
    sku_code: undefined,
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    sort_by: undefined,
    sort_direction: undefined,
  } satisfies IShoppingMallCustomerCartItem.IRequest;

  try {
    const secondPage: IPageIShoppingMallCustomerCartItem.ISummary =
      await api.functional.shoppingMall.customer.customerCarts.items.index(
        connection,
        {
          customerCartId: cart.id,
          body: secondIndexBody,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "after cart deletion, items index should return empty data array when successful",
      secondPage.data,
      [],
    );
  } catch {
    // If listing fails with an error, that's also acceptable as the cart
    // context is gone; do not assert on the specific error or status.
  }

  // 7. Accessing the specific cart item should now fail
  await TestValidator.error(
    "attempting to read a cart item of a deleted cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.items.at(
        connection,
        {
          customerCartId: cart.id,
          customerCartItemId: item.id,
        },
      );
    },
  );
}
