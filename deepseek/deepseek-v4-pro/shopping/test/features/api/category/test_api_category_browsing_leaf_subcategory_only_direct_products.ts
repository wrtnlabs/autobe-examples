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
 * Verify that browsing a leaf subcategory returns only products directly assigned to it.
 *
 * Tests the category browsing endpoint to confirm that when a customer browses a leaf subcategory (one with no child subcategories), only products directly assigned to that subcategory appear in the results. Products from the parent category or sibling subcategories must be excluded.
 *
 * 1. Admin creates a parent category and a leaf subcategory beneath it.
 * 2. Seller registers, gets approved, and creates two products: one under the parent category and one under the leaf subcategory.
 * 3. Each product receives a variant with positive inventory so they appear purchasable and visible in results.
 * 4. Customer joins and browses the leaf subcategory.
 * 5. Validates that only the product assigned to the leaf subcategory appears in the response — the parent-category product is excluded.
 * 6. Validates the returned product summary includes the seller shop name, and correctly reflects the leaf product's identity.
 * 7. Validates pagination shows exactly 1 record across 1 page.
 */
export async function test_api_category_browsing_leaf_subcategory_only_direct_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create leaf subcategory under parent
  const leafCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(leafCategory);
  // 4. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 5. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 6. Create product assigned to parent category (should be excluded from leaf results)
  const parentProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: parentCategory.id,
        },
      },
    );
  typia.assert(parentProduct);
  // 7. Add variant and inventory to parent-category product
  const parentVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: parentProduct.id },
      },
    );
  typia.assert(parentVariant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: parentProduct.id,
        variantId: parentVariant.id,
      },
      body: {
        quantity_change: 100,
      },
    },
  );
  // 8. Create product assigned to leaf subcategory (this should be the only result)
  const leafProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: leafCategory.id,
        },
      },
    );
  typia.assert(leafProduct);
  // 9. Add variant and inventory to leaf subcategory product
  const leafVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: leafProduct.id },
      },
    );
  typia.assert(leafVariant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: leafProduct.id,
        variantId: leafVariant.id,
      },
      body: {
        quantity_change: 100,
      },
    },
  );
  // 10. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 11. Customer browses the leaf subcategory
  const result =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: leafCategory.id,
        body: {},
      },
    );
  typia.assert(result);
  // 12. Assert only the leaf product appears
  TestValidator.equals("data length", result.data.length, 1);
  const product = result.data[0];
  TestValidator.equals(
    "product id matches leaf product",
    product.id,
    leafProduct.id,
  );
  TestValidator.equals(
    "product name matches leaf product",
    product.name,
    leafProduct.name,
  );
  TestValidator.equals(
    "base price matches leaf product",
    product.base_price,
    leafProduct.base_price,
  );
  // 13. Verify seller shop name is present in nested profile
  TestValidator.equals(
    "seller shop name matches",
    product.seller.profile.shop_name,
    seller.profile.shop_name,
  );
  // 14. Verify average_rating is null (no reviews on new product)
  TestValidator.equals("average rating is null", product.average_rating, null);
  // 15. Assert pagination: exactly 1 record across 1 page
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination records", result.pagination.records, 1);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
}
