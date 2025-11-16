import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate shopping mall product catalog search and filtering.
 *
 * This test covers public, unauthenticated access to the product search API,
 * including:
 *
 * - Keyword search by product title (partial match)
 * - Business status filtering (published, archived)
 * - Pagination navigation (pages and limits)
 * - Sorting by created_at and default_price (ascending and descending)
 * - Ensuring schema response integrity (pagination/data fields)
 * - Verifying only appropriate products are returned per search
 *
 * Steps:
 *
 * 1. Search all products (default, no filters) and check base pagination.
 * 2. Keyword search on product title (partial match):
 *
 *    - Sample a non-empty product title from initial result.
 *    - Use substring or full match as keyword.
 *    - Assert all returned products contain that keyword.
 * 3. Business status filtering (e.g., "published"):
 *
 *    - Search by business_status and verify all items have correct status.
 * 4. Pagination edge cases:
 *
 *    - Check limit=1 returns exactly one result per page.
 *    - Page through multiple pages and verify correct navigation.
 * 5. Sorting:
 *
 *    - Sort by created_at ascending/descending and check order.
 *    - Sort by default_price ascending/descending and check order.
 * 6. Business rule: Results never include products with status "archived" if
 *    searching for "published".
 */
export async function test_api_product_catalog_search_discovery(
  connection: api.IConnection,
) {
  // 1. Search all products (no filters) and check basic pagination and schema integrity
  const allResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {}, // no filters
    },
  );
  typia.assert(allResult);
  TestValidator.predicate(
    "pagination present (current >= 1)",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit <= 100",
    allResult.pagination.limit <= 100,
  );
  TestValidator.predicate("data is array", Array.isArray(allResult.data));

  // These tests require at least one product to exist; skip if catalog is empty
  if (allResult.data.length === 0) {
    TestValidator.equals(
      "empty catalog yields empty result",
      allResult.data.length,
      0,
    );
    return;
  }

  // --- Use record from first page for sample data/keywords ---
  const sample: IShoppingMallProduct.ISummary = allResult.data[0];
  typia.assert(sample);

  // 2. Keyword search by product title (partial match)
  const keyword = RandomGenerator.substring(sample.title);
  const keywordResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { title: keyword },
    },
  );
  typia.assert(keywordResult);
  TestValidator.predicate(
    "all results match keyword (title contains keyword)",
    keywordResult.data.every((prod) => prod.title.includes(keyword)),
  );

  // 3. Business status filtering ("published")
  const status = sample.business_status;
  const statusResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { business_status: status },
    },
  );
  typia.assert(statusResult);
  TestValidator.predicate(
    `all results have status=${status}`,
    statusResult.data.every((prod) => prod.business_status === status),
  );

  // 4. Pagination edge cases (limit=1, multiple pages)
  const pagedResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { limit: 1 },
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals("paged: limit = 1", pagedResult.data.length, 1);
  if (pagedResult.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.products.index(connection, {
      body: { limit: 1, page: 2 },
    });
    typia.assert(page2);
    TestValidator.equals(
      "paged: limit = 1, page=2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "paged: different first items on page 1 and page 2",
      pagedResult.data[0].id !== page2.data[0].id,
      true,
    );
  }

  // 5. Sorting: created_at ascending and descending
  for (const [sort_by, label] of [
    ["created_at", "created_at"],
    ["default_price", "default_price"],
  ] as const) {
    for (const order of ["asc", "desc"] as const) {
      const sorted = await api.functional.shoppingMall.products.index(
        connection,
        {
          body: { sort_by, order },
        },
      );
      typia.assert(sorted);
      const extractor = (prod: IShoppingMallProduct.ISummary) =>
        sort_by === "created_at"
          ? new Date(prod.created_at).getTime()
          : prod.default_price;
      const arr = sorted.data;
      TestValidator.predicate(
        `sorted by ${label} ${order}`,
        arr.every(
          (v, i, a) =>
            i === 0 ||
            (order === "asc"
              ? extractor(v) >= extractor(a[i - 1])
              : extractor(v) <= extractor(a[i - 1])),
        ),
      );
    }
  }

  // 6. Business rule: published filter never returns archived
  const publishedResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { business_status: "published" },
    },
  );
  typia.assert(publishedResult);
  TestValidator.predicate(
    "published query never returns archived",
    publishedResult.data.every((prod) => prod.business_status === "published"),
  );
}
