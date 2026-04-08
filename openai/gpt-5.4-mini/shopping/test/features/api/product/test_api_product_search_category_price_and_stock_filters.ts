import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test combined product discovery filters across keyword, category, price, stock, and sorting.
 *
 * Validates that marketplace product browsing correctly applies layered discovery criteria and returns coherent pagination and summary data. The test checks that keyword search, category scoping, price bounds, in-stock-only filtering, and price-based sorting all work together without breaking result shape or ordering.
 *
 * It also verifies that the response contains the expected summary fields for each returned product, that pagination metadata is internally consistent, and that results remain stable across multiple filter combinations including an empty or narrowed result set.
 *
 * 1. Request a baseline page of products and validate the page envelope.
 * 2. Reuse returned summaries to derive category and price targets for focused filter requests.
 * 3. Verify keyword, category, price range, and in-stock filters individually and in combination.
 * 4. Validate ascending and descending price ordering on the same filtered dataset.
 * 5. Confirm each returned summary includes the expected browse fields and pagination remains coherent.
 */
export async function test_api_product_search_category_price_and_stock_filters(
  connection: api.IConnection,
): Promise<void> {
  const pageSize = 20;
  const baseline = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: pageSize,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline pagination limit",
    baseline.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "baseline pagination current",
    baseline.pagination.current === 1,
  );
  TestValidator.predicate(
    "baseline pagination pages non-negative",
    baseline.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline pagination records non-negative",
    baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline data length within limit",
    baseline.data.length <= baseline.pagination.limit,
  );
  for (const item of baseline.data) {
    typia.assert(item);
    TestValidator.predicate("summary id exists", item.id.length > 0);
    TestValidator.predicate("summary name exists", item.name.length > 0);
    TestValidator.predicate(
      "summary description exists",
      item.description.length > 0,
    );
    TestValidator.predicate(
      "summary base price non-negative",
      item.basePrice >= 0,
    );
    TestValidator.predicate(
      "summary price min non-negative",
      item.priceMin >= 0,
    );
    TestValidator.predicate(
      "summary price max non-negative",
      item.priceMax >= 0,
    );
    TestValidator.predicate(
      "summary price range ordered",
      item.priceMin <= item.priceMax,
    );
    TestValidator.predicate(
      "summary createdAt exists",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "summary updatedAt exists",
      item.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "summary seller id exists",
      item.sellerAccount.id.length > 0,
    );
    TestValidator.predicate(
      "summary seller email exists",
      item.sellerAccount.email.length > 0,
    );
    TestValidator.predicate(
      "summary seller status exists",
      item.sellerAccount.status.length > 0,
    );
    TestValidator.predicate(
      "summary category or uncategorized",
      item.category === null || item.category.id.length > 0,
    );
  }
  const selected =
    baseline.data.find((item) => item.category !== null) ?? baseline.data[0];
  if (selected === undefined) return;
  const categoryId = selected.category?.id;
  const keyword = selected.name.split(/\s+/)[0] ?? selected.name;
  const priceAnchor = selected.priceMin;
  const priceFloor = Math.max(0, priceAnchor - 1);
  const priceCeil = selected.priceMax + 1;
  const categoryFiltered = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        categoryId,
        page: 1,
        limit: pageSize,
        sort: "newest",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(categoryFiltered);
  for (const item of categoryFiltered.data)
    TestValidator.equals("category filter", item.category?.id, categoryId);
  const keywordFiltered = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        search: keyword,
        page: 1,
        limit: pageSize,
        sort: "newest",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(keywordFiltered);
  for (const item of keywordFiltered.data)
    TestValidator.predicate(
      "keyword filter",
      item.name.toLowerCase().includes(keyword.toLowerCase()),
    );
  const priceAsc = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        search: keyword,
        categoryId,
        minPrice: priceFloor,
        maxPrice: priceCeil,
        inStockOnly: false,
        sort: "priceAsc",
        page: 1,
        limit: pageSize,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(priceAsc);
  const priceDesc = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        search: keyword,
        categoryId,
        minPrice: priceFloor,
        maxPrice: priceCeil,
        inStockOnly: false,
        sort: "priceDesc",
        page: 1,
        limit: pageSize,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(priceDesc);
  TestValidator.equals(
    "asc pagination current",
    priceAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "desc pagination current",
    priceDesc.pagination.current,
    1,
  );
  TestValidator.equals(
    "asc pagination limit",
    priceAsc.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "desc pagination limit",
    priceDesc.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "asc record count",
    priceAsc.pagination.records,
    priceDesc.pagination.records,
  );
  TestValidator.equals(
    "asc page count",
    priceAsc.pagination.pages,
    priceDesc.pagination.pages,
  );
  for (const item of priceAsc.data) {
    TestValidator.predicate(
      "asc keyword filter",
      item.name.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (categoryId !== undefined)
      TestValidator.equals(
        "asc category filter",
        item.category?.id,
        categoryId,
      );
    TestValidator.predicate(
      "asc min price filter",
      item.priceMax >= priceFloor,
    );
    TestValidator.predicate("asc max price filter", item.priceMin <= priceCeil);
  }
  for (const item of priceDesc.data) {
    TestValidator.predicate(
      "desc keyword filter",
      item.name.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (categoryId !== undefined)
      TestValidator.equals(
        "desc category filter",
        item.category?.id,
        categoryId,
      );
    TestValidator.predicate(
      "desc min price filter",
      item.priceMax >= priceFloor,
    );
    TestValidator.predicate(
      "desc max price filter",
      item.priceMin <= priceCeil,
    );
  }
  for (let i = 1; i < priceAsc.data.length; i++) {
    TestValidator.predicate(
      "ascending price order",
      priceAsc.data[i - 1].priceMin <= priceAsc.data[i].priceMin,
    );
  }
  for (let i = 1; i < priceDesc.data.length; i++) {
    TestValidator.predicate(
      "descending price order",
      priceDesc.data[i - 1].priceMax >= priceDesc.data[i].priceMax,
    );
  }
  const inStockOnly = await api.functional.mallPlatform.products.index(
    connection,
    {
      body: {
        search: keyword,
        categoryId,
        minPrice: priceFloor,
        maxPrice: priceCeil,
        inStockOnly: true,
        sort: "priceAsc",
        page: 1,
        limit: pageSize,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(inStockOnly);
  TestValidator.predicate(
    "in-stock results not larger than unrestricted results",
    inStockOnly.pagination.records <= priceAsc.pagination.records,
  );
  for (const item of inStockOnly.data) {
    TestValidator.predicate(
      "in-stock keyword filter",
      item.name.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (categoryId !== undefined)
      TestValidator.equals(
        "in-stock category filter",
        item.category?.id,
        categoryId,
      );
    TestValidator.predicate(
      "in-stock price filter low",
      item.priceMax >= priceFloor,
    );
    TestValidator.predicate(
      "in-stock price filter high",
      item.priceMin <= priceCeil,
    );
    TestValidator.predicate(
      "in-stock availability",
      item.availableVariantCount > 0,
    );
  }
  TestValidator.predicate(
    "baseline response shape has summaries",
    baseline.data.every((item) => item.sellerAccount !== null),
  );
}
