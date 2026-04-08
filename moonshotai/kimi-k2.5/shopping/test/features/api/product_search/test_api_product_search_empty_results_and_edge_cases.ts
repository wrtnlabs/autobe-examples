import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_empty_results_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Test 1: Search with text query that matches no products
  const emptySearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "xyzzynonexistentsearchterm12345",
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Verify empty results with proper pagination
  TestValidator.predicate(
    "empty search should return zero records",
    emptySearch.pagination.records === 0,
  );
  TestValidator.predicate(
    "empty search should return zero pages",
    emptySearch.pagination.pages === 0,
  );
  TestValidator.predicate(
    "empty search should return empty data array",
    emptySearch.data.length === 0,
  );
  TestValidator.equals("current page is 1", emptySearch.pagination.current, 1);
  TestValidator.equals("limit is 20", emptySearch.pagination.limit, 20);
  // Test 2: Search with price range that excludes all products (very high minimum)
  const highPriceSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: 999999999,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(highPriceSearch);
  TestValidator.predicate(
    "high price search should return zero records",
    highPriceSearch.pagination.records === 0,
  );
  TestValidator.predicate(
    "high price search should return empty data",
    highPriceSearch.data.length === 0,
  );
  // Test 3: Search with non-existent category and keyword combination
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const combinedSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "nonexistentproductname",
          categoryId: nonExistentCategoryId,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined criteria should return zero records",
    combinedSearch.pagination.records === 0,
  );
  TestValidator.predicate(
    "combined criteria should return empty data",
    combinedSearch.data.length === 0,
  );
  // Test 4: Verify large page number when no records exist
  const beyondLastPage =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "xyzzynonexistentsearchterm12345",
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 999,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(beyondLastPage);
  TestValidator.predicate(
    "beyond last page should return zero records",
    beyondLastPage.pagination.records === 0,
  );
  TestValidator.predicate(
    "beyond last page should return zero pages",
    beyondLastPage.pagination.pages === 0,
  );
  TestValidator.equals(
    "current page is preserved as requested",
    beyondLastPage.pagination.current,
    999,
  );
  // Test 5: Search with maximum allowed limit value
  const maxLimitSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "xyzzynonexistentsearchterm12345",
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "max limit search should handle limit properly",
    maxLimitSearch.pagination.limit === 100,
  );
  TestValidator.predicate(
    "max limit search should return zero records",
    maxLimitSearch.pagination.records === 0,
  );
  // Test 6: Search with limit = 1 edge case
  const singleLimitSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "xyzzynonexistentsearchterm12345",
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(singleLimitSearch);
  TestValidator.equals(
    "single limit search limit is 1",
    singleLimitSearch.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "single limit search should return zero pages",
    singleLimitSearch.pagination.pages === 0,
  );
}
