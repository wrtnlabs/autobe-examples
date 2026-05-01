import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that browsing a parent category includes products from all its subcategories.
 *
 * Validates the core product discovery mechanism where customers navigating a
 * top-level category see products from both the parent category itself and all
 * its direct child subcategories. This automatic subtree inclusion is the
 * primary way customers discover products within the category hierarchy.
 *
 * 1. Administrator creates a parent category and a child subcategory beneath it.
 * 2. Administrator approves a seller registration so the seller can create products.
 * 3. Seller creates one product directly assigned to the parent category with a
 *    variant and positive inventory stock, and another product assigned to the
 *    subcategory with the same setup.
 * 4. Customer browses the parent category with default parameters (newest first,
 *    no filters, first page).
 * 5. Validates both products appear in the paginated response.
 * 6. Validates each product summary contains the expected fields: thumbnail image
 *    (null when no images uploaded), product name, base price, variant price range,
 *    seller shop name, average rating (null when no reviews exist), review count (0),
 *    and purchasable flag.
 * 7. Validates pagination metadata: current page 1, total records 2, total pages 1.
 */
export async function test_api_category_browsing_parent_includes_subcategory_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — create categories
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  const childCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: { parent_id: parentCategory.id } },
    );
  typia.assert(childCategory);
  // 2. Seller setup — register and get approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Create product directly under parent category
  const parentProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: { shopping_mall_category_id: parentCategory.id } },
    );
  typia.assert(parentProduct);
  const parentVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: parentProduct.id } },
    );
  typia.assert(parentVariant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: parentProduct.id, variantId: parentVariant.id },
      body: { quantity_change: 100 },
    },
  );
  // 4. Create product under child subcategory
  const childProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: { shopping_mall_category_id: childCategory.id } },
    );
  typia.assert(childProduct);
  const childVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: childProduct.id } },
    );
  typia.assert(childVariant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: childProduct.id, variantId: childVariant.id },
      body: { quantity_change: 100 },
    },
  );
  // 5. Customer browses parent category
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const result =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: parentCategory.id,
        body: {},
      },
    );
  typia.assert(result);
  // 6. Validate both products appear in results
  const productIds = result.data.map((p) => p.id);
  TestValidator.predicate(
    "parent category product included",
    productIds.includes(parentProduct.id),
  );
  TestValidator.predicate(
    "subcategory product included",
    productIds.includes(childProduct.id),
  );
  // 7. Validate product summary fields
  for (const summary of result.data) {
    TestValidator.predicate(
      "product name is non-empty",
      summary.name.length > 0,
    );
    TestValidator.predicate("base_price is positive", summary.base_price > 0);
    TestValidator.predicate(
      "min_variant_price is non-null (has variants)",
      summary.min_variant_price !== null,
    );
    TestValidator.predicate(
      "max_variant_price is non-null (has variants)",
      summary.max_variant_price !== null,
    );
    TestValidator.predicate(
      "is_purchasable is true (has stock)",
      summary.is_purchasable === true,
    );
    TestValidator.equals(
      "average_rating is null (no reviews)",
      summary.average_rating,
      null,
    );
    TestValidator.equals("review_count is 0", summary.review_count, 0);
  }
  // 8. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    2,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 1);
}
