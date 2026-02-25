import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test the business rule that quantity updates are allowed even when exceeding
 * available stock, with stock warnings displayed during cart viewing rather than
 * at update time.
 *
 * **Setup:**
 * 1. A seller creates a product with a variant that has limited stock (3 units)
 * 2. A customer adds the variant to their cart with quantity 1
 *
 * **Test Execution:**
 * 1. Customer updates the cart item quantity to 10 (exceeding the 3 units in stock)
 * 2. Verify the update succeeds - stock validation is NOT performed at update time
 * 3. Verify the response shows quantity = 10
 *
 * **Validation Points:**
 * - Update succeeds with HTTP 200 (quantity update allowed despite insufficient stock)
 * - Response quantity field = 10
 * - unitPrice remains unchanged
 * - Business rule enforced: Stock warnings shown during cart viewing, not during updates
 */
export async function test_api_cart_item_quantity_exceeds_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create product with limited stock variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create variant with limited stock (3 units)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stockQuantity: 3,
        },
      },
    );
  typia.assert(variant);
  // 2. Customer setup - register and add variant to cart
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add variant to cart with initial quantity 1
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 3. Test: Update quantity to exceed stock (10 > 3 available)
  // Business rule: Update should succeed, stock warning shown during cart viewing
  const updatedItem =
    await api.functional.shoppingMall.customer.cart_items.update(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          quantity: 10,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // 4. Validation: Update succeeds with quantity exceeding stock
  TestValidator.equals(
    "quantity update succeeds despite exceeding stock",
    updatedItem.quantity,
    10,
  );
  TestValidator.equals(
    "unit price remains unchanged",
    updatedItem.unitPrice,
    cartItem.unitPrice,
  );
  TestValidator.equals(
    "variant id remains the same",
    updatedItem.variant.id,
    variant.id,
  );
}
