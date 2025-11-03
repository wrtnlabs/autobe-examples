import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_shopping_cart_item_removal_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        nickname: typia.random<string>(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Seller signs up
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "password123",
        store_name: typia.random<string>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCode = `P-${typia.random<string>().slice(0, 8)}`;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: typia.random<string>(),
        description: typia.random<string>(),
        brand: typia.random<string>(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Seller creates a SKU for the product
  const skuCode = `SKU-${typia.random<string>().slice(0, 6)}`;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: Math.floor(Math.random() * 10000) + 1000,
          attributes_json: JSON.stringify({ color: "red", size: "M" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 5. Customer creates a shopping cart
  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cart);

  // 6. Customer adds the SKU item to the shopping cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: cart.id,
        body: {
          shopping_mall_product_sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 7. Customer deletes the cart item
  await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
    connection,
    {
      cartId: cart.id,
      itemId: cartItem.id,
    },
  );

  // 8. Validate deletion by checking items don't exist - As we don't have a 'list' or 'get cart items' endpoint, we validate by trying to delete again and expect error
  await TestValidator.error(
    "deleting already deleted cart item should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
        connection,
        {
          cartId: cart.id,
          itemId: cartItem.id,
        },
      );
    },
  );
}
