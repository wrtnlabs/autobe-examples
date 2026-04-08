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

export async function test_api_product_search_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Test basic search with no filters - verify response structure
  const basicSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
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
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search has valid pagination",
    basicSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "basic search data is array",
    Array.isArray(basicSearch.data),
  );
  // 3. Test text search with keyword filter
  const keywordSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "test product",
          categoryId: null,
          subcategoryId: null,
          minPrice: null,
          maxPrice: null,
          inStockOnly: null,
          sortBy: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // 4. Test pagination with specific page and limit
  const paginatedSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
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
          limit: 5,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page matches request",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSearch.pagination.limit,
    5,
  );
  // 5. Test price range filtering (minPrice and maxPrice)
  const priceFilteredSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: null,
          categoryId: null,
          subcategoryId: null,
          minPrice: 100,
          maxPrice: 1000,
          inStockOnly: null,
          sortBy: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceFilteredSearch);
  // 6. Test sorting by price ascending
  const priceAscSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
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
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(priceAscSearch);
  // 7. Test sorting by newest
  const newestSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
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
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(newestSearch);
  // 8. Test inStockOnly filter
  const inStockSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
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
          limit: null,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockSearch);
  // 9. Test combined filters (keyword + price range + pagination + sorting)
  const combinedSearch =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          search: "product",
          categoryId: null,
          subcategoryId: null,
          minPrice: 10,
          maxPrice: 500,
          inStockOnly: null,
          sortBy: "priceDesc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search has correct limit",
    combinedSearch.pagination.limit,
    20,
  );
  TestValidator.equals(
    "combined search has correct page",
    combinedSearch.pagination.current,
    1,
  );
}
