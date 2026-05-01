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
 * Test that adding a cart item with quantity exceeding available stock is rejected.
 *
 * Validates the stock availability business rule at the cart-item creation endpoint.
 * When a customer attempts to add a product variant with a quantity greater than the
 * current available stock, the server must reject the request with an error.
 *
 * The test sets up the complete dependency chain before attempting the cart operation:
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product under the category and a variant (SKU) with no initial stock.
 * 4. Seller records exactly 3 units of inventory stock via an inventory record.
 * 5. Customer registers on the platform.
 * 6. Customer attempts to add the variant to their cart with quantity 10, exceeding the
 *    available stock of 3 — the request is rejected with an error.
 */
export async function test_api_cart_insufficient_stock_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller registration — starts in pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Administrator approves the pending seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  // 6. Seller creates a variant (SKU) with no initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: { initialStockQuantity: 0 },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 7. Seller records exactly 3 units of inventory stock
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: { quantity_change: 3, reason: "Initial stock" },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Customer attempts to add variant with quantity 10 (exceeds available stock of 3)
  await TestValidator.error(
    "adding variant with quantity exceeding available stock is rejected",
    async () => {
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: variant.id,
            quantity: 10,
          },
        },
      );
    },
  );
}
