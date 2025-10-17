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
 * End-to-End test for updating the quantity of a customer's shopping cart item.
 *
 * This test executes a realistic user journey including customer
 * authentication, shopping cart setup, product and SKU creation, cart item
 * addition, and finally updating the cart item's quantity via the target API
 * endpoint.
 *
 * Steps:
 *
 * 1. Customer signs up and authenticates
 * 2. Create customer entity
 * 3. Create shopping cart for this customer
 * 4. Create product category
 * 5. Create seller profile
 * 6. Create product under seller and category
 * 7. Create SKU for the product
 * 8. Add cart item with initial quantity to the cart
 * 9. Update cart item quantity to a new value
 * 10. Validate the updated cart item data from API response
 *
 * Validates response types, authorization procedures, and business logic.
 */
export async function test_api_update_cart_item_quantity_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "password123",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert(customerAuthorized);

  // 2. Create customer entity
  const customerCreateBody = {
    email: customerEmail,
    password_hash: "hashedPassword123", // Simulated hashed password
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.shoppingMall.customers.create(
    connection,
    {
      body: customerCreateBody,
    },
  );
  typia.assert(customer);

  // 3. Create shopping cart for this customer
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallShoppingCart.ICreate;
  const shoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // 4. Create product category
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: `Category ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
    display_order: 1,
  } satisfies IShoppingMallCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 5. Create seller profile
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedSellerPassword",
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    {
      body: sellerCreateBody,
    },
  );
  typia.assert(seller);

  // 6. Create product under seller and category
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: `PROD-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: `Product ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 })}`,
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert(product);

  // 7. Create SKU for the product
  const skuCreateBody = {
    shopping_mall_product_id: product.id,
    sku_code: `SKU-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    price: 100,
    status: "active",
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCreateBody,
    },
  );
  typia.assert(sku);

  // 8. Add cart item with initial quantity to the cart
  const cartItemCreateBody = {
    shopping_mall_shopping_cart_id: shoppingCart.id,
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.create(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 9. Update cart item quantity to a new value
  const newQuantity: number & tags.Type<"int32"> = 5;
  const cartItemUpdateBody = {
    quantity: newQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;

  const updatedCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.updateCartItem(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        cartItemId: cartItem.id,
        body: cartItemUpdateBody,
      },
    );
  typia.assert(updatedCartItem);

  // 10. Validate the updated cart item data from API response
  TestValidator.equals(
    "cart item updated quantity",
    updatedCartItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "cart item id unchanged",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart item shopping cart id unchanged",
    updatedCartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "cart item SKU id unchanged",
    updatedCartItem.shopping_mall_sku_id,
    sku.id,
  );
}
