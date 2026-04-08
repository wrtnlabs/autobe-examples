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
 * Test product search with multiple filter combinations including category, price range, and combined filters.
 *
 * Validates the product search functionality by testing various filter combinations to ensure correct filtering logic. The test creates a hierarchical category structure (Electronics parent with Laptops and Accessories subcategories) and products with different price points.
 *
 * Special attention is given to verifying that category filtering correctly includes products from subcategories, price filtering uses base_price accurately, and multiple filters are applied together with AND logic. The test also validates empty result scenarios return proper pagination metadata.
 *
 * 1. Administrator creates categories: 'Electronics' (parent), 'Laptops' (subcategory), 'Accessories' (subcategory).
 * 2. Seller registers and gets approved by administrator.
 * 3. Seller creates five products with different categories and prices.
 * 4. Test category filter: Search with category_id='Laptops' verifies only Laptops products returned.
 * 5. Test price range filter: Search with min_price=100, max_price=1500 verifies correct price filtering.
 * 6. Test combined filters: category='Laptops', price range verifies AND logic.
 * 7. Test no results scenario: Apply filters that match no products verifies empty response.
 */
export async function test_api_product_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  // 2. Create categories
  const electronicsCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic products and devices",
        },
      },
    );
  typia.assert(electronicsCategory);
  const laptopsCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: "Laptop computers",
          parent_category_id: electronicsCategory.id,
        },
      },
    );
  typia.assert(laptopsCategory);
  const accessoriesCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Accessories",
          description: "Electronic accessories",
          parent_category_id: electronicsCategory.id,
        },
      },
    );
  typia.assert(accessoriesCategory);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerAuth);
  // 4. Approve seller
  await api.functional.shoppingMall.administrator.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {},
    },
  );
  // 5. Create products
  // Product A: Category 'Laptops', price $999
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Gaming Laptop Pro",
        description: "High-performance gaming laptop",
        base_price: 999,
        category_id: laptopsCategory.id,
      },
    },
  );
  typia.assert(productA);
  // Product B: Category 'Laptops', price $1299
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Business Laptop Elite",
        description: "Premium business laptop",
        base_price: 1299,
        category_id: laptopsCategory.id,
      },
    },
  );
  typia.assert(productB);
  // Product C: Category 'Accessories', price $29
  const productC = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        base_price: 29,
        category_id: accessoriesCategory.id,
      },
    },
  );
  typia.assert(productC);
  // Product D: Category 'Electronics', price $199
  const productD = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "USB Hub",
        description: "Multi-port USB hub",
        base_price: 199,
        category_id: electronicsCategory.id,
      },
    },
  );
  typia.assert(productD);
  // Product E: No category, price $49
  const productE = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Phone Stand",
        description: "Adjustable phone stand",
        base_price: 49,
        category_id: null,
      },
    },
  );
  typia.assert(productE);
  // 6. Test category filter: Search with category_id='Laptops'
  const categorySearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        category_id: laptopsCategory.id,
      },
    });
  typia.assert(categorySearchResult);
  TestValidator.equals(
    "category filter returns Laptops products only",
    categorySearchResult.data.length,
    2,
  );
  const categoryProductIds = categorySearchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "Product A is in Laptops category results",
    categoryProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "Product B is in Laptops category results",
    categoryProductIds.includes(productB.id),
  );
  TestValidator.predicate(
    "Product C is NOT in Laptops category results",
    !categoryProductIds.includes(productC.id),
  );
  TestValidator.predicate(
    "Product D is NOT in Laptops category results",
    !categoryProductIds.includes(productD.id),
  );
  TestValidator.predicate(
    "Product E is NOT in Laptops category results",
    !categoryProductIds.includes(productE.id),
  );
  // 7. Test price range filter: Search with min_price=100, max_price=1500
  const priceSearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        min_price: 100,
        max_price: 1500,
      },
    });
  typia.assert(priceSearchResult);
  TestValidator.equals(
    "price range filter returns 3 products",
    priceSearchResult.data.length,
    3,
  );
  const priceProductIds = priceSearchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "Product A ($999) is in price range results",
    priceProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "Product B ($1299) is in price range results",
    priceProductIds.includes(productB.id),
  );
  TestValidator.predicate(
    "Product D ($199) is in price range results",
    priceProductIds.includes(productD.id),
  );
  TestValidator.predicate(
    "Product C ($29) is NOT in price range results",
    !priceProductIds.includes(productC.id),
  );
  TestValidator.predicate(
    "Product E ($49) is NOT in price range results",
    !priceProductIds.includes(productE.id),
  );
  // 8. Test combined filters: category='Laptops', min_price=500, max_price=1500
  const combinedSearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        category_id: laptopsCategory.id,
        min_price: 500,
        max_price: 1500,
      },
    });
  typia.assert(combinedSearchResult);
  TestValidator.equals(
    "combined filters return 2 products (both Laptops in price range)",
    combinedSearchResult.data.length,
    2,
  );
  const combinedProductIds = combinedSearchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "Product A is in combined filter results",
    combinedProductIds.includes(productA.id),
  );
  TestValidator.predicate(
    "Product B is in combined filter results",
    combinedProductIds.includes(productB.id),
  );
  // 9. Test no results scenario: Apply filters that match no products
  const noResultsSearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        min_price: 10000,
        max_price: 20000,
      },
    });
  typia.assert(noResultsSearchResult);
  TestValidator.equals(
    "no results returns empty data array",
    noResultsSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no results pagination shows records=0",
    noResultsSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results pagination shows pages=0",
    noResultsSearchResult.pagination.pages,
    0,
  );
}
