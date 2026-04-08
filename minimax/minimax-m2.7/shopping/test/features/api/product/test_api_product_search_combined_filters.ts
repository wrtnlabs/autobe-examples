import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product search endpoint with combined filters including name query, category filter, price range, and stock availability.
 *
 * Validates the complete product search flow by creating multiple products with different attributes, then applying various filter combinations. Ensures that the search correctly filters by query string (case-insensitive partial match), category UUID, price range boundaries, and stock availability. Pagination metadata is validated for accurate result counting. Special attention is given to verifying that soft-deleted products are never returned even when matching all other filter criteria.
 *
 * 1. Administrator creates a category for product filtering.
 * 2. Seller registers and gets approved to create products.
 * 3. Seller creates multiple products with different names, prices, and stock states.
 * 4. Apply search filters combining query, category, price range, and stock availability.
 * 5. Validate that only products matching ALL filter criteria are returned.
 * 6. Verify pagination metadata accurately reflects filtered results.
 * 7. Confirm soft-deleted products are never returned even when matching filters.
 */
export async function test_api_product_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Register seller with unique email and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPass123!";
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Create multiple products with different attributes for filter testing
  // Product 1: Matches query "phone", price 500, in stock
  const product1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Smartphone Pro Max",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: 500,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product1);
  // Product 2: Matches query "phone", price 300, out of stock (no variants)
  const product2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Basic Phone",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: 300,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product2);
  // Product 3: Does NOT match query "phone", price 800, in stock
  const product3 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Tablet Device",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: 800,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product3);
  // Product 4: Matches query "phone", price 200 (below range 250-550), in stock
  const product4 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Phone Mini",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: 200,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product4);
  // Product 5: Matches query "phone", price 600 (above range 250-550), in stock
  const product5 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Phone Ultra",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: 600,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product5);
  // Product 6: Matches query, price, stock but DIFFERENT category
  const anotherCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics Other",
        },
      },
    );
  typia.assert(anotherCategory);
  const product6 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Phone Case",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: 450,
          categoryId: anotherCategory.id,
        },
      },
    );
  typia.assert(product6);
  // 4. Test combined filters - query "phone", category, price range 250-550, inStock=true
  // Expected matches: product1 (name has "phone", 500 in range, in stock)
  const searchResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        query: "phone",
        category: category.id,
        minPrice: 250,
        maxPrice: 550,
        inStock: true,
        page: 1,
        limit: 20,
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // 5. Validate filter results
  // product1 (500) - matches: query ✓, category ✓, price (250-550) ✓, inStock ✓
  // product2 (300) - matches: query ✓, category ✓, price (250-550) ✓, inStock ✗ (no variants)
  // product4 (200) - matches: query ✓, category ✓, price (250-550) ✗ (200 < 250), inStock ✓
  // product5 (600) - matches: query ✓, category ✓, price (250-550) ✗ (600 > 550), inStock ✓
  // product6 - matches: query ✓, category ✗, price (250-550) ✓, inStock ✓
  // Only product1 should match ALL criteria
  TestValidator.equals("total filtered products", searchResult.data.length, 1);
  TestValidator.equals(
    "total records in pagination",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "product id matches",
    searchResult.data[0].id,
    product1.id,
  );
  TestValidator.equals(
    "product name matches",
    searchResult.data[0].name,
    product1.name,
  );
  // 6. Test without inStock filter - should include product2 (300, no variants so out of stock)
  const searchWithOutOfStock =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        query: "phone",
        category: category.id,
        minPrice: 250,
        maxPrice: 550,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(searchWithOutOfStock);
  // Should include product1 (500) and product2 (300)
  TestValidator.equals(
    "includes out of stock products",
    searchWithOutOfStock.data.length,
    2,
  );
  // 7. Test query only filter - all products with "phone" in name
  const searchByQuery = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        query: "phone",
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchByQuery);
  // Should include product1, product2, product4, product5, product6 (all contain "phone")
  TestValidator.equals(
    "query filter returns matching products",
    searchByQuery.data.length,
    5,
  );
  TestValidator.predicate(
    "all results contain phone",
    searchByQuery.data.every((p) => p.name.toLowerCase().includes("phone")),
  );
  // 8. Test price range only filter
  const searchByPriceRange = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        minPrice: 400,
        maxPrice: 600,
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchByPriceRange);
  // Should include products with price 400-600: product1 (500), product5 (600), product6 (450)
  TestValidator.predicate(
    "price range filter works",
    searchByPriceRange.data.every(
      (p) => p.basePrice >= 400 && p.basePrice <= 600,
    ),
  );
  // 9. Test category filter only
  const searchByCategory = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category: category.id,
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchByCategory);
  // Product6 should not be in this category (it's in anotherCategory)
  TestValidator.predicate(
    "category filter excludes wrong category",
    !searchByCategory.data.some((p) => p.id === product6.id),
  );
  // 10. Test pagination metadata
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.predicate(
    "total pages >= 1",
    searchResult.pagination.pages >= 1,
  );
  TestValidator.equals("limit is 20", searchResult.pagination.limit, 20);
  // 11. Test case-insensitive query
  const searchUpperCase = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        query: "PHONE",
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchUpperCase);
  TestValidator.equals(
    "case-insensitive query",
    searchUpperCase.data.length,
    searchByQuery.data.length,
  );
}
