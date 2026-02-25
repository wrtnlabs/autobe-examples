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
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that adding the same variant multiple times combines quantities into a single cart item.
 * This validates the quantity accumulation business rule where the second addition
 * of the same variant updates the existing cart item instead of creating a duplicate.
 *
 * **Setup Steps:**
 * 1. Admin authentication and category creation
 * 2. Seller registration and approval workflow
 * 3. Product creation with variant containing initial stock
 * 4. Customer authentication
 * 5. First cart addition with quantity 5
 * 6. Second cart addition with same variant, quantity 3
 *
 * **Validations:**
 * - Combined quantity is 8 (5 + 3)
 * - Same cart item ID returned (no duplicate created)
 * - unitPrice preserved from first addition
 * - updatedAt timestamp reflects second addition
 * - Variant summary remains accurate
 */
export async function test_api_cart_quantity_combination(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin for category creation and seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create category for product
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Approve seller to enable product creation
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // Create product under approved seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
      },
    },
  );
  // Create variant with sufficient initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          stockQuantity: 100,
        },
      },
    );
  // Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // First cart addition - quantity 5
  const firstCartItem = await api.functional.shoppingMall.customer.cart.create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 5,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(firstCartItem);
  // Store timestamps from first addition
  const firstCreatedAt = firstCartItem.createdAt;
  const firstUnitPrice = firstCartItem.unitPrice;
  // Second cart addition - same variant, quantity 3
  const secondCartItem = await api.functional.shoppingMall.customer.cart.create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 3,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(secondCartItem);
  // VALIDATIONS
  // Quantity should be combined: 5 + 3 = 8
  TestValidator.equals("combined quantity", secondCartItem.quantity, 8);
  // Same cart item ID - existing item updated, not new item created
  TestValidator.equals(
    "same cart item ID",
    secondCartItem.id,
    firstCartItem.id,
  );
  // unitPrice preserved from first addition (not recalculated)
  TestValidator.equals(
    "unitPrice unchanged from first addition",
    secondCartItem.unitPrice,
    firstUnitPrice,
  );
  // updatedAt should reflect the second addition time
  TestValidator.predicate(
    "updatedAt reflects second addition",
    secondCartItem.updatedAt > firstCreatedAt,
  );
  // Variant summary remains accurate
  TestValidator.equals(
    "variant ID matches",
    secondCartItem.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant SKU code matches",
    secondCartItem.variant.sku_code,
    variant.skuCode,
  );
}
