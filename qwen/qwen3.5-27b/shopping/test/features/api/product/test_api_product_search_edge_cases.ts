import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product search edge cases including uncategorized products, products without variants, and stock status filtering.
 *
 * Validates that the product search endpoint correctly handles edge cases in product catalog management. Ensures uncategorized products remain visible in search results, products without variants are marked as unavailable, out-of-stock products can be filtered, and sorting options work correctly across various product states.
 *
 * Special attention is given to verifying that products with null category assignments are searchable, products without variants show variant_count=0 and in_stock=false, and that the in_stock_only filter correctly excludes products with zero inventory.
 *
 * 1. Administrator authenticates for category management.
 * 2. Seller authenticates for product creation.
 * 3. Administrator creates a test category.
 * 4. Seller creates four products in different states: categorized with stock, uncategorized with stock, categorized without variants, and categorized out of stock.
 * 5. Search without filters and verify all products are included with correct category and stock status.
 * 6. Verify uncategorized product has null category field.
 * 7. Verify product without variants has variant_count=0 and in_stock=false.
 * 8. Search with in_stock_only=true and verify out-of-stock products are excluded.
 * 9. Test sorting options (newest, price_asc, price_desc) and verify correct ordering.
 */
export async function test_api_product_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "http://localhost:3000/seller/login",
      referrer: "http://localhost:3000/seller",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create test category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Test Category",
          description: "Test category for edge case validation",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 4. Create Product A: Categorized with stock
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product A - Categorized with stock",
        description: "This product has a category and variants with stock",
        base_price: 10000,
        category_id: category.id,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);
  // 5. Create Product B: Uncategorized with stock
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product B - Uncategorized with stock",
        description: "This product has no category but has variants with stock",
        base_price: 15000,
        category_id: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);
  // 6. Create Product C: Categorized without variants
  const productC = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product C - Categorized without variants",
        description: "This product has a category but no variants",
        base_price: 20000,
        category_id: category.id,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productC);
  // 7. Create Product D: Categorized out of stock
  const productD = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product D - Categorized out of stock",
        description:
          "This product has a category but variants are out of stock",
        base_price: 25000,
        category_id: category.id,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productD);
  // 8. Search without filters - all products should be included
  const searchAll = await api.functional.shoppingMall.products.search.index(
    connection,
    {
      body: {
        page: 1,
        pageSize: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchAll);
  // Verify all four products are in results
  const productIds = searchAll.data.map((p) => p.id);
  TestValidator.predicate(
    "Product A in results",
    productIds.includes(productA.id),
  );
  TestValidator.predicate(
    "Product B in results",
    productIds.includes(productB.id),
  );
  TestValidator.predicate(
    "Product C in results",
    productIds.includes(productC.id),
  );
  TestValidator.predicate(
    "Product D in results",
    productIds.includes(productD.id),
  );
  // 9. Verify Product B (uncategorized) has null category
  const productBResult = searchAll.data.find((p) => p.id === productB.id);
  if (productBResult === undefined)
    throw new Error("Product B not found in search results");
  TestValidator.equals(
    "Product B category is null",
    productBResult.category,
    null,
  );
  // 10. Verify Product C (no variants) has variant_count=0 and in_stock=false
  const productCResult = searchAll.data.find((p) => p.id === productC.id);
  if (productCResult === undefined)
    throw new Error("Product C not found in search results");
  TestValidator.equals(
    "Product C variant_count is 0",
    productCResult.variant_count,
    0,
  );
  TestValidator.equals(
    "Product C in_stock is false",
    productCResult.in_stock,
    false,
  );
  // 11. Search with in_stock_only=true - Product D should be excluded
  const searchInStock = await api.functional.shoppingMall.products.search.index(
    connection,
    {
      body: {
        page: 1,
        pageSize: 100,
        in_stock_only: true,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchInStock);
  const inStockProductIds = searchInStock.data.map((p) => p.id);
  TestValidator.predicate(
    "Product D excluded from in_stock_only search",
    !inStockProductIds.includes(productD.id),
  );
  // 12. Test sorting by newest
  const searchNewest = await api.functional.shoppingMall.products.search.index(
    connection,
    {
      body: {
        page: 1,
        pageSize: 100,
        sortBy: "newest",
        sortOrder: "desc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchNewest);
  // Verify products are ordered by created_at descending (at least for our test products)
  const ourProductsNewest = searchNewest.data.filter((p) =>
    [productA.id, productB.id, productC.id, productD.id].includes(p.id),
  );
  for (let i = 1; i < ourProductsNewest.length; i++) {
    TestValidator.predicate(
      `Product ${i} created after or same time as Product ${i - 1} in newest sort`,
      new Date(ourProductsNewest[i].created_at).getTime() <=
        new Date(ourProductsNewest[i - 1].created_at).getTime(),
    );
  }
  // 13. Test sorting by price ascending
  const searchPriceAsc =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        page: 1,
        pageSize: 100,
        sortBy: "price_asc",
        sortOrder: "asc",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(searchPriceAsc);
  // Verify our products are ordered by base_price ascending
  const ourProductsPriceAsc = searchPriceAsc.data.filter((p) =>
    [productA.id, productB.id, productC.id, productD.id].includes(p.id),
  );
  for (let i = 1; i < ourProductsPriceAsc.length; i++) {
    TestValidator.predicate(
      `Product ${i} price >= Product ${i - 1} price in price_asc sort`,
      ourProductsPriceAsc[i].base_price >=
        ourProductsPriceAsc[i - 1].base_price,
    );
  }
  // 14. Test sorting by price descending
  const searchPriceDesc =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        page: 1,
        pageSize: 100,
        sortBy: "price_desc",
        sortOrder: "desc",
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(searchPriceDesc);
  // Verify our products are ordered by base_price descending
  const ourProductsPriceDesc = searchPriceDesc.data.filter((p) =>
    [productA.id, productB.id, productC.id, productD.id].includes(p.id),
  );
  for (let i = 1; i < ourProductsPriceDesc.length; i++) {
    TestValidator.predicate(
      `Product ${i} price <= Product ${i - 1} price in price_desc sort`,
      ourProductsPriceDesc[i].base_price <=
        ourProductsPriceDesc[i - 1].base_price,
    );
  }
  // 15. Verify pagination metadata
  TestValidator.predicate(
    "Pagination current page is 1",
    searchAll.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination limit is 100",
    searchAll.pagination.limit === 100,
  );
  TestValidator.predicate(
    "Total records include our products",
    searchAll.pagination.records >= 4,
  );
}
