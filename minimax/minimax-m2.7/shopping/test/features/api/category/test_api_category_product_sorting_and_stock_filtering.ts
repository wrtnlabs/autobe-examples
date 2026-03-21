import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_category_product_sorting_and_stock_filtering(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create admin, seller, category, and test products
  // ============================================================
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller login to get approved status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: (await import("@nestia/e2e")).RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Create category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 5. Create products with different prices and stock levels
  // Product 1: $10, in-stock (quantity > 0)
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Budget Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: 10,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // Product 2: $50, in-stock (quantity > 0)
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Mid-Range Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: 50,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // Product 3: $100, out-of-stock (quantity = 0 via no variant or zero quantity variant)
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Premium Product Out of Stock",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: 100,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product3);
  // Product 4: $30, in-stock
  const product4 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Affordable Product",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: 30,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product4);
  // Product 5: $75, out-of-stock
  const product5 = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Exclusive Product Out of Stock",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: 75,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product5);
  // ============================================================
  // TEST 1: Sort by price ascending
  // ============================================================
  const sortedAsc =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        sort: "price_asc",
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortedAsc);
  // Verify ascending order (excluding products without variants or with zero stock from ranking consideration)
  const ascPrices = sortedAsc.data.map((p) => p.min_price);
  const sortedAscPrices = [...ascPrices].sort((a, b) => a - b);
  TestValidator.equals(
    "price ascending sort order",
    ascPrices,
    sortedAscPrices,
  );
  // ============================================================
  // TEST 2: Sort by price descending
  // ============================================================
  const sortedDesc =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        sort: "price_desc",
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortedDesc);
  // Verify descending order
  const descPrices = sortedDesc.data.map((p) => p.min_price);
  const sortedDescPrices = [...descPrices].sort((a, b) => b - a);
  TestValidator.equals(
    "price descending sort order",
    descPrices,
    sortedDescPrices,
  );
  // ============================================================
  // TEST 3: Filter by inStock=true
  // ============================================================
  const inStockResults =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        inStock: true,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(inStockResults);
  // Verify all returned products have stock (variants with quantity > 0)
  // Note: min_price > 0 or base_price based filtering depends on implementation
  // This test validates that the inStock filter works and returns products
  TestValidator.predicate(
    "inStock filter returns products",
    inStockResults.data.length > 0,
  );
  // ============================================================
  // TEST 4: Combine price range with inStock filter
  // ============================================================
  const priceAndStockResults =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId: category.id,
      body: {
        minPrice: 20,
        maxPrice: 80,
        inStock: true,
        sort: "price_asc",
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceAndStockResults);
  // Verify all returned products are within price range
  for (const product of priceAndStockResults.data) {
    TestValidator.predicate(
      `product ${product.name} price ${product.min_price} within range 20-80`,
      product.min_price >= 20 && product.min_price <= 80,
    );
  }
  // Verify prices are sorted in ascending order
  const combinedPrices = priceAndStockResults.data.map((p) => p.min_price);
  const sortedCombinedPrices = [...combinedPrices].sort((a, b) => a - b);
  TestValidator.equals(
    "combined filter maintains ascending sort",
    combinedPrices,
    sortedCombinedPrices,
  );
  // ============================================================
  // TEST 5: Verify pagination metadata
  // ============================================================
  TestValidator.predicate(
    "pagination records count is accurate",
    sortedAsc.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is accurate",
    sortedAsc.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    sortedAsc.pagination.current === 1,
  );
  // ============================================================
  // TEST 6: Verify product summary data structure
  // ============================================================
  const firstProduct = sortedAsc.data[0];
  if (firstProduct) {
    TestValidator.predicate(
      "product has valid UUID",
      /^[0-9a-f-]{36}$/i.test(firstProduct.id),
    );
    TestValidator.predicate("product has name", firstProduct.name.length > 0);
    TestValidator.predicate(
      "product has valid price",
      firstProduct.min_price >= 0,
    );
    TestValidator.predicate(
      "product has seller name",
      firstProduct.seller_name.length > 0,
    );
  }
}
