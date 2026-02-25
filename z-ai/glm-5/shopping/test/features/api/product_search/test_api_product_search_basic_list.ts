import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test basic product search functionality with default parameters.
 *
 * This test validates the core product discovery workflow:
 * 1. Setup: Admin creates category, seller creates products with variants and inventory
 * 2. Execute: Search products with minimal parameters (page=1, limit=10)
 * 3. Validate: Response contains pagination and product summaries
 */
export async function test_api_product_search_basic_list(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // SETUP: Create actors and test data
  // ========================================
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 4. Create category for products
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Create first product with variant and inventory
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { category_id: category.id } },
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product1.id } },
    );
  typia.assert(variant1);
  const inventory1 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant1.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory1);
  // 6. Create second product with variant and inventory
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { category_id: category.id } },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product2.id } },
    );
  typia.assert(variant2);
  const inventory2 =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant2.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory2);
  // ========================================
  // EXECUTE: Search products with basic parameters
  // ========================================
  // Use public connection (no auth required for product search)
  const publicConnection: api.IConnection = { host: connection.host };
  const searchResult = await api.functional.shoppingMall.products.index(
    publicConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // ========================================
  // VALIDATE: Response structure and data
  // ========================================
  // Verify pagination object exists with all required fields
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null,
  );
  TestValidator.predicate(
    "pagination has current",
    searchResult.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records",
    searchResult.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages",
    searchResult.pagination.pages !== undefined,
  );
  // Verify pagination values
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("page limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "total records is positive",
    searchResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages is positive",
    searchResult.pagination.pages >= 1,
  );
  // Verify data array exists and contains products
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "data contains products",
    searchResult.data.length >= 2,
  );
  // Verify each product summary has required fields
  for (const product of searchResult.data) {
    TestValidator.predicate("product has id", product.id !== undefined);
    TestValidator.predicate("product has name", product.name !== undefined);
    TestValidator.predicate(
      "product has base_price",
      product.base_price !== undefined,
    );
    TestValidator.predicate(
      "product has created_at",
      product.created_at !== undefined,
    );
  }
  // Verify created products are in the search results
  const productIds = searchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "product1 in results",
    productIds.includes(product1.id),
  );
  TestValidator.predicate(
    "product2 in results",
    productIds.includes(product2.id),
  );
  // Verify products are sorted by creation date descending (newest first)
  const products = searchResult.data;
  for (let i = 0; i < products.length - 1; i++) {
    const currentCreatedAt = new Date(products[i].created_at).getTime();
    const nextCreatedAt = new Date(products[i + 1].created_at).getTime();
    TestValidator.predicate(
      "sorted by creation date descending",
      currentCreatedAt >= nextCreatedAt,
    );
  }
}
