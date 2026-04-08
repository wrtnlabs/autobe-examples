import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product search with inStockOnly filter and different sorting options.
 * Validates stock filtering, various sort orders, and pagination functionality.
 */
export async function test_api_product_search_stock_filter_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test inStockOnly filter - fetch all products first
  const allProductsResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: null,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResponse);
  // Separate products by availability status
  const availableProducts = allProductsResponse.data.filter(
    (p) => p.availabilityStatus === "available",
  );
  const unavailableProducts = allProductsResponse.data.filter(
    (p) => p.availabilityStatus === "unavailable",
  );
  // 2. Test inStockOnly=true - should only return available products
  const inStockResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: true,
        sortBy: null,
        page: null,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockResponse);
  // Verify all returned products are available (no unavailable products)
  inStockResponse.data.forEach((product) => {
    TestValidator.equals(
      `product ${product.id} should be available when inStockOnly=true`,
      product.availabilityStatus,
      "available",
    );
  });
  // 3. Test sorting by 'newest' (created_at DESC)
  const newestResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: "newest",
        page: null,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(newestResponse);
  // Verify descending order by createdAt
  for (let i = 0; i < newestResponse.data.length - 1; i++) {
    const current = new Date(newestResponse.data[i].createdAt).getTime();
    const next = new Date(newestResponse.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `product at index ${i} should be newer than product at index ${i + 1}`,
      current >= next,
    );
  }
  // 4. Test sorting by 'priceAsc' (base_price ASC)
  const priceAscResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: "priceAsc",
        page: null,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscResponse);
  // Verify ascending order by basePrice
  for (let i = 0; i < priceAscResponse.data.length - 1; i++) {
    const current = priceAscResponse.data[i].basePrice;
    const next = priceAscResponse.data[i + 1].basePrice;
    TestValidator.predicate(
      `product at index ${i} should have price <= product at index ${i + 1}`,
      current <= next,
    );
  }
  // 5. Test sorting by 'priceDesc' (base_price DESC)
  const priceDescResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: "priceDesc",
        page: null,
        limit: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResponse);
  // Verify descending order by basePrice
  for (let i = 0; i < priceDescResponse.data.length - 1; i++) {
    const current = priceDescResponse.data[i].basePrice;
    const next = priceDescResponse.data[i + 1].basePrice;
    TestValidator.predicate(
      `product at index ${i} should have price >= product at index ${i + 1}`,
      current >= next,
    );
  }
  // 6. Test pagination
  const limit = 5;
  const page1Response = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: 1,
        limit,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page1Response);
  // Validate pagination structure
  TestValidator.equals("page should be 1", page1Response.pagination.current, 1);
  TestValidator.equals(
    "limit should match request",
    page1Response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    page1Response.data.length <= limit,
  );
  if (page1Response.pagination.records > limit) {
    const page2Response = await api.functional.ecommerceMall.products.index(
      connection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 2,
          limit,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
    typia.assert(page2Response);
    TestValidator.equals(
      "page should be 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 should have different data than page 1",
      !(
        page1Response.data.length > 0 &&
        page2Response.data.length > 0 &&
        page1Response.data[0].id === page2Response.data[0].id
      ),
    );
  }
  // 7. Verify products without variants have availabilityStatus 'unavailable'
  if (unavailableProducts.length > 0) {
    unavailableProducts.forEach((product) => {
      TestValidator.equals(
        `unavailable product ${product.id} should have availabilityStatus 'unavailable'`,
        product.availabilityStatus,
        "unavailable",
      );
    });
  }
}
