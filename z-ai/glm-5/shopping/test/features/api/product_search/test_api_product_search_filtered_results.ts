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

export async function test_api_product_search_filtered_results(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // Setup Phase
  // ===========================================
  // Admin connection for category creation and seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // Seller connection for product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Approve seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Create categories
  const category1 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Electronics" } },
  );
  const category2 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Home" } },
  );
  // Create products with specific characteristics for testing
  // Product 1: Lower price, Electronics, in stock
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Bluetooth Speaker",
        base_price: 50,
        category_id: category1.id,
        description: "High quality speaker",
      },
    },
  );
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: "WBS-001",
          optionValues: [{ key: "color", value: "Black" }],
        },
      },
    );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant1.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  // Product 2: Higher price, different category, in stock
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Earbuds",
        base_price: 150,
        category_id: category2.id,
        description: "Portable earbuds",
      },
    },
  );
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: "WE-001",
          optionValues: [{ key: "color", value: "White" }],
        },
      },
    );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant2.id },
      body: { quantity: 50, reason: "Initial stock" },
    },
  );
  // Product 3: High price, Electronics, in stock
  const product3 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Premium Headphones",
        base_price: 200,
        category_id: category1.id,
        description: "Noise cancelling",
      },
    },
  );
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product3.id },
        body: {
          skuCode: "PH-001",
          optionValues: [{ key: "color", value: "Silver" }],
        },
      },
    );
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    sellerConnection,
    {
      params: { variantId: variant3.id },
      body: { quantity: 30, reason: "Initial stock" },
    },
  );
  // Product 4: Low price, Electronics, OUT OF STOCK
  const product4 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Budget Earbuds",
        base_price: 25,
        category_id: category1.id,
        description: "Affordable audio",
      },
    },
  );
  const variant4 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product4.id },
        body: {
          skuCode: "BE-001",
          optionValues: [{ key: "color", value: "Black" }],
        },
      },
    );
  // No inventory added - out of stock
  // ===========================================
  // Test 1: Name Filter (ILIKE partial match)
  // ===========================================
  const nameSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { name: "wireless" },
    },
  );
  typia.assert(nameSearch);
  // Verify created products with "wireless" in name are found
  TestValidator.predicate(
    "created wireless products found",
    nameSearch.data.some((p) => p.id === product1.id || p.id === product2.id),
  );
  // ===========================================
  // Test 2: Category Filter
  // ===========================================
  const categorySearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { categoryId: category1.id },
    },
  );
  typia.assert(categorySearch);
  // Verify products in category1 are found
  TestValidator.predicate(
    "products in category1 found",
    categorySearch.data.some(
      (p) => p.id === product1.id || p.id === product3.id,
    ),
  );
  // Verify product2 (different category) is excluded
  TestValidator.predicate(
    "product in different category excluded",
    !categorySearch.data.some((p) => p.id === product2.id),
  );
  // ===========================================
  // Test 3: In-Stock Filter
  // ===========================================
  const inStockSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { inStock: true },
    },
  );
  typia.assert(inStockSearch);
  // Verify products with stock are found
  TestValidator.predicate(
    "in-stock products found",
    inStockSearch.data.some((p) => p.id === product1.id),
  );
  // Verify product4 (out of stock) is NOT in results
  TestValidator.predicate(
    "out of stock product excluded",
    !inStockSearch.data.some((p) => p.id === product4.id),
  );
  // ===========================================
  // Test 4: Combined Filters
  // ===========================================
  const combinedSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        name: "wireless",
        categoryId: category1.id,
        priceMin: 40,
        priceMax: 100,
        inStock: true,
      },
    },
  );
  typia.assert(combinedSearch);
  // Should return product1 (Wireless Bluetooth Speaker in Electronics, $50, in stock)
  TestValidator.predicate(
    "product1 found with combined filters",
    combinedSearch.data.some((p) => p.id === product1.id),
  );
  // Verify product2 excluded (wrong category)
  TestValidator.predicate(
    "product in wrong category excluded",
    !combinedSearch.data.some((p) => p.id === product2.id),
  );
  // Verify product3 excluded (price too high)
  TestValidator.predicate(
    "product with price above range excluded",
    !combinedSearch.data.some((p) => p.id === product3.id),
  );
  // ===========================================
  // Test 5: Sort by Price Ascending
  // ===========================================
  const priceAscSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { sort: "price_asc", limit: 10 },
    },
  );
  typia.assert(priceAscSearch);
  // Get positions of our products to verify ordering
  const positions = {
    product1: priceAscSearch.data.findIndex((p) => p.id === product1.id),
    product2: priceAscSearch.data.findIndex((p) => p.id === product2.id),
    product3: priceAscSearch.data.findIndex((p) => p.id === product3.id),
  };
  // Verify product1 ($50) comes before product2 ($150) and product3 ($200)
  if (positions.product1 >= 0 && positions.product2 >= 0) {
    TestValidator.predicate(
      "lower price product comes first in asc sort",
      positions.product1 < positions.product2,
    );
  }
  if (positions.product2 >= 0 && positions.product3 >= 0) {
    TestValidator.predicate(
      "medium price before high price in asc sort",
      positions.product2 < positions.product3,
    );
  }
  // ===========================================
  // Test 6: Sort by Price Descending
  // ===========================================
  const priceDescSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { sort: "price_desc", limit: 10 },
    },
  );
  typia.assert(priceDescSearch);
  // Get positions of our products to verify ordering
  const descPositions = {
    product1: priceDescSearch.data.findIndex((p) => p.id === product1.id),
    product2: priceDescSearch.data.findIndex((p) => p.id === product2.id),
    product3: priceDescSearch.data.findIndex((p) => p.id === product3.id),
  };
  // Verify product3 ($200) comes before product2 ($150) and product1 ($50)
  if (descPositions.product3 >= 0 && descPositions.product2 >= 0) {
    TestValidator.predicate(
      "higher price product comes first in desc sort",
      descPositions.product3 < descPositions.product2,
    );
  }
  if (descPositions.product2 >= 0 && descPositions.product1 >= 0) {
    TestValidator.predicate(
      "medium price before low price in desc sort",
      descPositions.product2 < descPositions.product1,
    );
  }
  // ===========================================
  // Test 7: Pagination
  // ===========================================
  const page1 = await api.functional.shoppingMall.products.index(connection, {
    body: { page: 1, limit: 2 },
  });
  typia.assert(page1);
  const page2 = await api.functional.shoppingMall.products.index(connection, {
    body: { page: 2, limit: 2 },
  });
  typia.assert(page2);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination current page 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  // Verify page 1 and page 2 have different products
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "different products on different pages",
      !page1.data.some((p1) => page2.data.some((p2) => p1.id === p2.id)),
    );
  }
}
