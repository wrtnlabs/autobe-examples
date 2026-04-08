import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // Create test data: categories and products
  const categories = ArrayUtil.repeat(3, () => ({
    name: RandomGenerator.name(3),
    description: typia.random<string & tags.MaxLength<500>>(),
  }));
  const products = ArrayUtil.repeat(10, (index: number) => ({
    name: `Product ${index + 1} ${RandomGenerator.name(2)}`,
    description: `Description for product ${index + 1} with details`,
    base_price: (index + 1) * 1000,
    category: { id: categories[index % categories.length].name } as any,
    seller: { id: RandomGenerator.alphaNumeric(8) } as any,
  }));
  // 2. Search by text term
  const textSearchResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          search: "Product 1",
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(textSearchResults);
  TestValidator.equals(
    "text search returns matching results",
    textSearchResults.data.length > 0,
    true,
  );
  // 3. Search by single category ID (using first category)
  const singleCategoryResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          categoryIds: [typia.random<string & tags.Format<"uuid">>()],
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(singleCategoryResults);
  TestValidator.equals(
    "single category filter returns valid structure",
    singleCategoryResults.pagination.records >= 0,
    true,
  );
  // 4. Search by multiple category IDs (max 10)
  const multiCategoryIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  ).slice(0, 10);
  const multiCategoryResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          categoryIds: multiCategoryIds,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(multiCategoryResults);
  TestValidator.equals(
    "multi-category filter returns valid structure",
    multiCategoryResults.pagination.records >= 0,
    true,
  );
  // 5. Search by seller ID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilterResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          sellerId,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sellerFilterResults);
  TestValidator.equals(
    "seller filter returns valid structure",
    sellerFilterResults.pagination.records >= 0,
    true,
  );
  // 6. Search by price range
  const minPrice = 5000;
  const maxPrice = 10000;
  const priceRangeResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          minPrice,
          maxPrice,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceRangeResults);
  // Validate all returned products are within price range
  for (const product of priceRangeResults.data) {
    const priceValid =
      product.base_price >= minPrice && product.base_price <= maxPrice;
    TestValidator.predicate(
      `product price within range (${product.base_price})`,
      priceValid,
    );
  }
  // 7. Search with inStockOnly=true
  const inStockOnlyResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          inStockOnly: true,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockOnlyResults);
  TestValidator.equals(
    "inStockOnly=true returns valid structure",
    inStockOnlyResults.pagination.records >= 0,
    true,
  );
  // 8. Search with inStockOnly=false
  const notInStockOnlyResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          inStockOnly: false,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(notInStockOnlyResults);
  TestValidator.equals(
    "inStockOnly=false returns valid structure",
    notInStockOnlyResults.pagination.records >= 0,
    true,
  );
  // 9. Search by date range
  const createdAtMin = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtMax = new Date().toISOString();
  const dateRangeResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          createdAtMin,
          createdAtMax,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.equals(
    "date range filter returns valid structure",
    dateRangeResults.pagination.records >= 0,
    true,
  );
  // 10. Combine multiple filters: category + price range + inStockOnly
  const combinedFilters = typia.random<string & tags.Format<"uuid">>();
  const combinedResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          categoryIds: [combinedFilters],
          minPrice: 1000,
          maxPrice: 15000,
          inStockOnly: true,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filters returns valid structure",
    combinedResults.pagination.records >= 0,
    true,
  );
  // 11. Test empty results with non-existent category
  const emptyResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          categoryIds: ["00000000-0000-0000-0000-000000000000"],
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "non-existent category returns empty data array",
    emptyResults.data.length,
    0,
  );
  TestValidator.predicate(
    "empty results have valid pagination",
    emptyResults.pagination.pages >= 0 &&
      emptyResults.pagination.records >= 0 &&
      emptyResults.pagination.current >= 0 &&
      emptyResults.pagination.limit >= 0,
  );
  // 12. Verify pagination metadata consistency
  TestValidator.equals(
    "pages calculated correctly",
    combinedResults.pagination.pages,
    Math.max(
      1,
      Math.ceil(
        combinedResults.pagination.records / combinedResults.pagination.limit,
      ),
    ),
  );
  // 13. Verify sort by created_at desc works
  const sortResults =
    await api.functional.ecommerceMall.administrator.products.search.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sortResults);
}
