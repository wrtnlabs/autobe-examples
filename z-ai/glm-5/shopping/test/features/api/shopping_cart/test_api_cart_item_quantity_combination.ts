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
 * Test that adding the same variant to cart combines quantities instead of creating duplicate items.
 *
 * **Prerequisites Setup:**
 * 1. Register and authenticate a customer account
 * 2. Register a seller account
 * 3. Have an administrator approve the seller
 * 4. Create a product category
 * 5. Create a product with the approved seller
 * 6. Create a product variant (SKU) with initial stock
 *
 * **Test Execution:**
 * 1. Authenticate as the customer
 * 2. First, add variant to cart with quantity 5
 * 3. Verify cart item is created with quantity 5
 * 4. Add the same variant again with quantity 7
 * 5. Verify response shows:
 *    - Same cart item ID (not a new one)
 *    - Quantity is now 12 (5 + 7 combined)
 *    - updatedAt timestamp is updated
 *    - unitPrice remains the same as first addition
 */
export async function test_api_cart_item_quantity_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup Seller (will be in pending status initially)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // Seller connection is already authenticated from join
  // No need to re-login - seller was just approved and session is valid
  // 4. Create category as admin
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Create product as approved seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Create variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: null,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Black"] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L"] as const),
            },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 7. Setup Customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. First cart addition - quantity 5
  const firstCartItem =
    await api.functional.shoppingMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 5,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // Validate first cart item
  TestValidator.equals("first cart item quantity", firstCartItem.quantity, 5);
  TestValidator.equals(
    "cart item variant matches",
    firstCartItem.variant.id,
    variant.id,
  );
  const firstCartItemId = firstCartItem.id;
  const firstUnitPrice = firstCartItem.unitPrice;
  const firstUpdatedAt = firstCartItem.updatedAt;
  // 9. Second cart addition - same variant with quantity 7
  const secondCartItem =
    await api.functional.shoppingMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 7,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // 10. Validate quantity combination
  TestValidator.equals(
    "same cart item ID - quantities combined",
    secondCartItem.id,
    firstCartItemId,
  );
  TestValidator.equals("combined quantity is 12", secondCartItem.quantity, 12);
  TestValidator.equals(
    "unit price unchanged",
    secondCartItem.unitPrice,
    firstUnitPrice,
  );
  TestValidator.predicate(
    "updatedAt timestamp updated",
    new Date(secondCartItem.updatedAt).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
}
