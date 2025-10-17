import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_cart_update_cart_item_quantity_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a product category as admin
  const categoryCode = `cat-${RandomGenerator.alphaNumeric(6)}`;
  const categoryName = RandomGenerator.name(2);
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: categoryName,
          display_order: 1,
          parent_id: null,
          description: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: "1234",
        status: "active",
        company_name: RandomGenerator.name(3),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Seller creates a product
  const productCode = `prod-${RandomGenerator.alphaNumeric(6)}`;
  const productName = RandomGenerator.name(3);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: productCode,
        name: productName,
        description: null,
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Seller adds a SKU variant to the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuPrice = 10000;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: skuCode,
        price: skuPrice,
        weight: null,
        status: "active",
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 6. Customer creates shopping cart
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: { shopping_mall_customer_id: customer.id },
      },
    );
  typia.assert(shoppingCart);

  // 7. Customer adds SKU item as cart item
  const initialQuantity: number =
    (RandomGenerator.alphaNumeric(1).charCodeAt(0) % 8) + 1; // 1-8
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.create(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        body: {
          shopping_mall_shopping_cart_id: shoppingCart.id,
          shopping_mall_sku_id: sku.id,
          quantity: initialQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 8. Update cart item quantity to a different positive integer
  let newQuantity = initialQuantity + 1;
  if (newQuantity > 10) newQuantity = 1;

  const updatedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.updateCartItem(
      connection,
      {
        shoppingCartId: shoppingCart.id,
        cartItemId: cartItem.id,
        body: { quantity: newQuantity } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);

  TestValidator.equals(
    "updated quantity is set correctly",
    updatedCartItem.quantity,
    newQuantity,
  );

  // 9. Authorization test: attempt to update cart item as a different customer
  // Create another customer
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherCustomerEmail,
        password: "1234",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(otherCustomer);

  // Attempt update - should fail with error
  await TestValidator.error(
    "non-owning customer cannot update cart item",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.cartItems.updateCartItem(
        connection,
        {
          shoppingCartId: shoppingCart.id,
          cartItemId: cartItem.id,
          body: {
            quantity: newQuantity,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
}
