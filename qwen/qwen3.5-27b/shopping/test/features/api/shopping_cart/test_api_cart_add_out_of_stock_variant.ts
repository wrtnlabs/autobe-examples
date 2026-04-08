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
 * Test adding an out-of-stock product variant to the customer shopping cart.
 *
 * Validates that customers can add out-of-stock product variants to their cart, but the item is marked as unavailable for checkout. The cart item should be successfully created with the correct quantity and pricing information, while the product variant details show zero stock quantity.
 *
 * This test verifies the business rule that allows customers to browse and add items to cart regardless of stock status, but prevents checkout of unavailable items. The system preserves the cart item's price and product information for future reference when stock becomes available again.
 *
 * 1. Register and authenticate a seller account to create products.
 * 2. Register and authenticate a customer account for cart operations.
 * 3. Seller creates a product with a base price and description.
 * 4. Seller creates a product variant with zero initial stock (out of stock).
 * 5. Customer adds the out-of-stock variant to their cart with quantity 1.
 * 6. Validates cart item creation success with correct quantity and subtotal.
 * 7. Verifies the product variant shows stock_quantity as 0 in the response.
 * 8. Confirms the cart item contains complete product and variant information.
 */
export async function test_api_cart_add_out_of_stock_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup customer account and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with zero initial stock (out of stock)
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 0, // Explicitly set to 0 for out-of-stock scenario
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds the out-of-stock variant to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCustomerCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Validate cart item was created successfully
  TestValidator.equals("cart item quantity", cartItem.quantity, 1);
  // 7. Validate the product variant shows zero stock
  TestValidator.equals(
    "variant stock quantity is zero",
    cartItem.productVariant.stock_quantity,
    0,
  );
  // 8. Validate subtotal is calculated correctly (price * quantity)
  const expectedSubtotal =
    (cartItem.productVariant.price ??
      cartItem.productVariant.product.base_price) * cartItem.quantity;
  TestValidator.equals(
    "subtotal calculation",
    cartItem.subtotal,
    expectedSubtotal,
  );
  // 9. Validate cart item contains correct product variant ID
  TestValidator.equals(
    "product variant ID matches",
    cartItem.productVariant.id,
    variant.id,
  );
  // 10. Validate cart belongs to the authenticated customer
  TestValidator.equals(
    "cart customer ID",
    cartItem.cart.customer.id,
    customerAuth.id,
  );
  // 11. Validate timestamps are set
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(cartItem.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(cartItem.updated_at);
    return !isNaN(date.getTime());
  });
  // 12. Validate cart item is not deleted (active)
  TestValidator.equals("cart item is active", cartItem.deleted_at, null);
}
