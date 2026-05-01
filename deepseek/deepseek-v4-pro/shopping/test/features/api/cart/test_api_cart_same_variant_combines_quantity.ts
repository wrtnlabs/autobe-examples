import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that adding the same product variant to the cart twice combines quantities
 * into a single cart entry rather than creating duplicate line items.
 *
 * Validates the upsert behavior of the cart-items endpoint where the same
 * (customer, product_variant) pair results in quantity increment instead of
 * duplicate entries. The test confirms that the cart item ID remains unchanged,
 * the quantity is correctly summed, the updated_at timestamp advances, and the
 * available flag correctly reflects stock sufficiency.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, gets admin approval, creates a product with a variant,
 *    and records 10 units of inventory stock.
 * 3. Customer registers and adds the variant to cart with quantity 3.
 * 4. Customer adds the same variant again with quantity 2 — the quantities
 *    combine to 5 within the same cart item entry.
 * 5. Validates that the second response shares the same cart item ID as the
 *    first, has the combined quantity of 5, has a later updated_at timestamp,
 *    and the available flag remains true.
 */
export async function test_api_cart_same_variant_combines_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Administrator approves the pending seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // Seller creates a variant (SKU) for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Seller records 10 units of inventory stock
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        quantity_change: 10,
        reason: "Initial stock for cart combination test",
      },
    },
  );
  // 3. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Customer adds variant with quantity 3 — first cart item
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 3,
        },
      },
    );
  typia.assert(firstCartItem);
  // 5. Customer adds the same variant with quantity 2 — should combine
  const secondCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(secondCartItem);
  // 6. Validations
  TestValidator.equals(
    "combined quantity is 5 (3 + 2)",
    secondCartItem.quantity,
    5,
  );
  TestValidator.equals(
    "same cart item ID — quantities combined rather than new entry created",
    secondCartItem.id,
    firstCartItem.id,
  );
  TestValidator.predicate(
    "updated_at timestamp advanced after quantity combination",
    secondCartItem.updated_at > firstCartItem.updated_at,
  );
  TestValidator.predicate(
    "available flag remains true — stock (10) exceeds combined quantity (5)",
    secondCartItem.available,
  );
}
