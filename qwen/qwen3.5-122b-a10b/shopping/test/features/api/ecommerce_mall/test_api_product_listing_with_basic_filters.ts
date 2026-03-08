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

export async function test_api_product_listing_with_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic product listing with default parameters
  const basicList = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(basicList);
  TestValidator.equals(
    "pagination structure has current",
    basicList.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination structure has limit",
    basicList.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination structure has records",
    basicList.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination structure has pages",
    basicList.pagination.pages >= 0,
    true,
  );
  // Verify product summary structure
  if (basicList.data.length > 0) {
    const product = basicList.data[0];
    TestValidator.equals(
      "product has id",
      typeof product.id === "string",
      true,
    );
    TestValidator.equals(
      "product has name",
      typeof product.name === "string",
      true,
    );
    TestValidator.equals(
      "product has basePrice",
      typeof product.basePrice === "number",
      true,
    );
    TestValidator.equals(
      "product has status",
      typeof product.status === "string",
      true,
    );
    TestValidator.equals("product has seller", product.seller !== null, true);
    TestValidator.equals(
      "seller has shop_name",
      typeof product.seller.shop_name === "string",
      true,
    );
    TestValidator.equals(
      "product has category",
      product.category !== null,
      true,
    );
    TestValidator.equals(
      "category has name",
      typeof product.category.name === "string",
      true,
    );
    TestValidator.equals(
      "product has mainImageUrl",
      typeof product.mainImageUrl === "string",
      true,
    );
    TestValidator.equals(
      "product has averageRating",
      typeof product.averageRating === "number",
      true,
    );
    TestValidator.equals(
      "product has reviewCount",
      typeof product.reviewCount === "number",
      true,
    );
    TestValidator.equals(
      "product has createdAt",
      typeof product.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "product has updatedAt",
      typeof product.updatedAt === "string",
      true,
    );
    TestValidator.equals(
      "product has deletedAt",
      product.deletedAt === null || typeof product.deletedAt === "string",
      true,
    );
  }
  // Test 2: Search by product name
  const searchTerm = RandomGenerator.paragraph({ sentences: 1 });
  const searchResults = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: { search: searchTerm } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchResults);
  // Test 3: Filter by category_id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: categoryId,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(categoryFiltered);
  // Test 4: Filter by price range
  const minPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0>
  >();
  const maxPrice =
    minPrice + typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>();
  const priceFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        min_price: minPrice,
        max_price: maxPrice,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceFiltered);
  // Verify all products are within price range
  for (const product of priceFiltered.data) {
    TestValidator.equals(
      `product ${product.id} price >= min`,
      product.basePrice >= minPrice,
      true,
    );
    TestValidator.equals(
      `product ${product.id} price <= max`,
      product.basePrice <= maxPrice,
      true,
    );
  }
  // Test 5: Filter by in_stock
  const inStockFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: { in_stock: true } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockFiltered);
  // Test 6: Sort by newest
  const newestSorted = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: { sort: "newest" } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(newestSorted);
  // Test 7: Sort by price_asc
  const priceAscSorted = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: { sort: "price_asc" } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscSorted);
  // Test 8: Sort by price_desc
  const priceDescSorted = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: { sort: "price_desc" } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescSorted);
  // Test 9: Pagination with page and limit
  const page1 = await api.functional.ecommerceMall.products.index(connection, {
    body: { page: 1, limit: 10 } satisfies IEcommerceMallProduct.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  const page2 = await api.functional.ecommerceMall.products.index(connection, {
    body: { page: 2, limit: 10 } satisfies IEcommerceMallProduct.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // Test 10: Combined filters
  const combined = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: searchTerm,
        category_id: categoryId,
        min_price: minPrice,
        max_price: maxPrice,
        in_stock: true,
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(combined);
}
