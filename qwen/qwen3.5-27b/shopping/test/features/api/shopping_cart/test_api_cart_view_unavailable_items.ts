import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test viewing a customer's shopping cart when cart items reference unavailable or out-of-stock variants.
 *
 * Validates that the shopping cart correctly displays items even when the requested quantity exceeds available stock. The test verifies that cart items with insufficient inventory are still visible to the customer, with accurate stock information and correct price calculations.
 *
 * This test ensures customers can see which items in their cart have availability issues before attempting checkout, allowing them to adjust quantities or remove items as needed.
 *
 * 1. Register and authenticate a customer for cart operations.
 * 2. Register and authenticate a seller for product creation.
 * 3. Seller creates a product with base price and description.
 * 4. Seller creates a product variant with limited initial stock (3 units).
 * 5. Customer adds the variant to cart with quantity exceeding stock (5 units).
 * 6. Customer retrieves their shopping cart via GET endpoint.
 * 7. Validates cart contains the item with correct stock_quantity (3) and quantity (5).
 * 8. Verifies subtotal calculation is accurate despite insufficient inventory.
 * 9. Confirms total price includes the unavailable item's subtotal.
 */
export async function test_api_cart_view_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a variant with limited stock (3 units)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 3,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart with quantity exceeding stock (5 units)
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 5,
      },
    },
  );
  // 6. Customer retrieves their shopping cart
  const cart =
    await api.functional.shoppingMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // 7. Validate cart contains the item
  TestValidator.predicate("cart has items", cart.cart_items.length > 0);
  const cartItem = cart.cart_items.find(
    (item) => item.productVariant.id === variant.id,
  );
  TestValidator.predicate("cart contains the variant", cartItem !== undefined);
  // 8. Validate stock_quantity shows available inventory (3)
  TestValidator.equals(
    "stock_quantity reflects available inventory",
    cartItem!.productVariant.stock_quantity,
    3,
  );
  // 9. Validate quantity shows what customer added (5)
  TestValidator.equals(
    "quantity shows customer request",
    cartItem!.quantity,
    5,
  );
  // 10. Validate subtotal calculation (price × quantity)
  const expectedSubtotal =
    (cartItem!.productVariant.price ??
      cartItem!.productVariant.product.base_price) * cartItem!.quantity;
  TestValidator.equals(
    "subtotal calculated correctly",
    cartItem!.subtotal,
    expectedSubtotal,
  );
  // 11. Validate total includes the item
  TestValidator.equals(
    "total includes cart item subtotal",
    cart.total,
    cart.cart_items.reduce((sum, item) => sum + item.subtotal, 0),
  );
  // 12. Verify stock is insufficient (quantity > stock_quantity)
  TestValidator.predicate(
    "cart item has insufficient stock",
    cartItem!.quantity > cartItem!.productVariant.stock_quantity,
  );
}
