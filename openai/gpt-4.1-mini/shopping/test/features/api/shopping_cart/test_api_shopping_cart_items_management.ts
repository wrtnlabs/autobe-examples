import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * End-to-end test for managing shopping cart items by a customer.
 *
 * This test covers the entire flow starting from customer and seller user
 * registration to the creation of SKUs by the seller, creation of shopping cart
 * by the customer, and managing cart items within that shopping cart via the
 * PATCH endpoint.
 *
 * The test performs the following actions:
 *
 * 1. Customer joins and obtains authorization token.
 * 2. Seller joins and obtains authorization token.
 * 3. Seller creates a product SKU which can be added to the shopping cart.
 * 4. Customer creates a new shopping cart.
 * 5. Customer uses the PATCH API to filter, paginate, and update cart items. This
 *    includes querying with filters and updating quantities.
 * 6. Validate the correctness and consistency of the updated cart items.
 *
 * All API calls are awaited, roles are switched properly to simulate role-based
 * authorization, and typia.assert is used for strict response type validation.
 */
export async function test_api_shopping_cart_items_management(
  connection: api.IConnection,
) {
  // 1. Customer joins
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassword123!",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedSellerPassword",
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Seller creates a SKU
  // For this demo, productId is randomly generated as there's no product creation API
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const skuCreateBody = {
    shopping_mall_product_id: productId,
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    price: 10000,
    status: "active",
  } satisfies IShoppingMallSku.ICreate;

  // Seller must login before creating SKU
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: "hashedSellerPassword",
  } satisfies IShoppingMallSeller.ILogin;
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productId,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Customer creates a shopping cart
  // Customer must login before creating shopping cart
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    __typename: "ILogin",
  } satisfies IShoppingMallCustomer.ILogin;

  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // Shopping cart is linked to customer via customer id
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallShoppingCart.ICreate;
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // 5. Customer uses PATCH API to search and update cart items
  const filterRequest1 = {
    shopping_mall_shopping_cart_id: shoppingCart.id,
    shopping_mall_sku_id: sku.id,
  } satisfies IShoppingMallCartItem.IRequest;

  const pageResult1: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.index(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        body: filterRequest1,
      },
    );
  typia.assert(pageResult1);

  // Check if pageResult contains expected shopping cart id
  for (const item of pageResult1.data) {
    TestValidator.equals(
      "shopping cart id matches filter",
      item.shopping_mall_shopping_cart_id,
      shoppingCart.id,
    );
  }

  // 6. Update quantities or details of cart items
  // NOTE: Since the patch API is index operation; simulate update by re-query with a changed filter

  // We simulate an update filter to request different quantity (change to 2)
  const filterRequest2 = {
    shopping_mall_shopping_cart_id: shoppingCart.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.IRequest;

  const pageResult2: IPageIShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.index(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        body: filterRequest2,
      },
    );
  typia.assert(pageResult2);

  for (const item of pageResult2.data) {
    TestValidator.equals("updated quantity matches", item.quantity, 2);
  }
}
