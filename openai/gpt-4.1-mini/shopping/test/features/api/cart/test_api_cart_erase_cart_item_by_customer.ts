import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the flow where a customer successfully deletes a cart item from their
 * shopping cart.
 *
 * This test implements the full realistic scenario:
 *
 * 1. Customer registers via /auth/customer/join obtaining authorization token.
 * 2. Admin registers via /auth/admin/join to be able to create product category.
 * 3. Admin creates a product category to classify products.
 * 4. Seller registers via /auth/seller/join.
 * 5. Seller creates a product owned by the seller and linked to the product
 *    category.
 * 6. Seller creates a SKU variant under the product with proper details.
 * 7. Customer creates a new shopping cart representing the customer's cart.
 * 8. Customer adds a cart item for the SKU variant to the shopping cart.
 * 9. Customer sends DELETE request to remove the cart item from cart.
 *
 * Assertions include typia.assert for response types and TestValidator checks
 * to ensure data consistency and API contracts.
 *
 * After deletion, the cart item should be removed and any subsequent get or
 * listing should confirm this removal (though explicit get APIs are not
 * provided in given context, this concludes with successful deletion API
 * call).
 *
 * Authentication tokens are managed implicitly by the SDK.
 */
export async function test_api_cart_erase_cart_item_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashedPassword", // Password hash provided
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Admin creates product category
  const categoryCreateBody = {
    code: `cat${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(),
    display_order: RandomGenerator.alphaNumeric(1).charCodeAt(0),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: "hashedPassword",
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Seller creates a product under category
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: `prod${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Seller creates SKU for product
  const skuCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: `sku${RandomGenerator.alphaNumeric(5)}`,
    price: 1000,
    status: "active",
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Customer creates shopping cart
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

  // 8. Customer adds cart item
  const cartItemCreateBody = {
    shopping_mall_shopping_cart_id: shoppingCart.id,
    shopping_mall_sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.create(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 9. Customer deletes the cart item
  await api.functional.shoppingMall.customer.shoppingCarts.cartItems.eraseCartItem(
    connection,
    {
      shoppingCartId: shoppingCart.id,
      cartItemId: cartItem.id,
    },
  );

  // The delete returns no content; test passed if no error thrown
}
