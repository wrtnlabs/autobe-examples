import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that the system enforces the maximum limit of 50 distinct variants
 * per customer cart.
 *
 * Setup:
 * 1. Admin creates category
 * 2. Seller registers and is approved by admin
 * 3. Create 51 products with variants (each with unique SKU)
 * 4. Customer registers
 *
 * Test:
 * 1. Add 50 distinct variants to cart (should succeed)
 * 2. Attempt to add 51st variant (should fail with error)
 */
export async function test_api_cart_item_limit_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create category for products
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(category);
  // Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Create 51 products with variants (need 51 distinct variants for testing)
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < 51; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Product-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          base_price: 10000,
          category_id: category.id,
        },
      },
    );
    typia.assert(product);
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            price: 10000,
            stockQuantity: 100,
            optionValues: [{ key: "color", value: RandomGenerator.name() }],
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // Setup customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add 50 distinct variants to cart (should all succeed)
  for (let i = 0; i < 50; i++) {
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        { body: { variantId: variants[i].id, quantity: 1 } },
      );
    typia.assert(cartItem);
  }
  // Attempt to add 51st distinct variant - should fail with error
  await TestValidator.error("cart item limit exceeded", async () => {
    await api.functional.shoppingMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          variantId: variants[50].id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  });
}
