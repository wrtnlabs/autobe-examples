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
 * Test the primary success path of adding a product variant to a customer's shopping cart for the first time.
 *
 * This test validates the complete cart item creation workflow including seller product setup, customer authentication, and cart item addition. It ensures that the cart item correctly captures the variant details, quantity, and calculates the subtotal accurately.
 *
 * Special attention is given to verifying that the price is preserved at the time of cart addition and that the cart is automatically created if it doesn't exist.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant with SKU code, options, and initial stock quantity.
 * 4. Customer registers and authenticates for cart operations.
 * 5. Customer adds the variant to cart with a specified quantity.
 * 6. Validates cart item details including quantity, subtotal calculation, and variant information.
 */
export async function test_api_cart_add_new_variant_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // 3. Seller creates a variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 5. Customer adds variant to cart with quantity 2
  const quantity = 2;
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Validate cart item response
  TestValidator.equals("cart item has valid ID", cartItem.id.length, 36);
  TestValidator.equals("quantity matches input", cartItem.quantity, quantity);
  // Validate subtotal calculation
  const expectedSubtotal = (variant.price ?? product.base_price) * quantity;
  TestValidator.equals(
    "subtotal calculated correctly",
    cartItem.subtotal,
    expectedSubtotal,
  );
  // Validate variant information is included
  TestValidator.equals(
    "variant SKU code matches",
    cartItem.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "variant product ID matches",
    cartItem.productVariant.product.id,
    product.id,
  );
  // Validate cart information is included
  TestValidator.predicate("cart has valid ID", cartItem.cart.id.length === 36);
  TestValidator.predicate(
    "cart customer ID exists",
    cartItem.cart.customer.id.length === 36,
  );
  // Validate timestamps are set
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(cartItem.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(cartItem.updated_at)),
  );
  // Validate item is active (not deleted)
  TestValidator.equals(
    "cart item is active (not deleted)",
    cartItem.deleted_at,
    null,
  );
}
