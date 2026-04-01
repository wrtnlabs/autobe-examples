import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResult);
  // 2. Test search with combined filters (category, price range, in-stock)
  const searchWithAllFilters =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          min_price: 1000,
          max_price: 50000,
          in_stock: true,
          sort: "newest",
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchWithAllFilters);
  // Validate pagination structure values (business logic, not types)
  TestValidator.predicate(
    "current page is valid",
    searchWithAllFilters.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    searchWithAllFilters.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchWithAllFilters.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchWithAllFilters.pagination.pages >= 0,
  );
  // 3. Test price range boundary conditions
  const searchWithPriceRange =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          min_price: 0,
          max_price: 100000,
          sort: "priceAsc",
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchWithPriceRange);
  // 4. Test sorting with filters - price descending
  const searchPriceDesc =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          min_price: 1000,
          max_price: 50000,
          sort: "priceDesc",
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchPriceDesc);
  // 5. Test in-stock filter only
  const searchInStock =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          in_stock: true,
          sort: "newest",
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchInStock);
  // 6. Test search with no filters (default behavior)
  const searchNoFilters =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          sort: "newest",
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchNoFilters);
  // 7. Test pagination with filters - page 2
  const searchPage2 =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          min_price: 1000,
          max_price: 50000,
          in_stock: true,
          sort: "newest",
          limit: 10,
          page: 2,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchPage2);
  TestValidator.equals("page 2 current", searchPage2.pagination.current, 2);
  // 8. Test edge case - very restrictive price range (may return empty result)
  const searchRestrictive =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          min_price: 999999,
          max_price: 1000000,
          in_stock: true,
          sort: "newest",
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchRestrictive);
  // Empty result is valid for restrictive filters - structure validation done by typia.assert
  // 9. Test different sort options with filters
  const searchNewest =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          min_price: 1000,
          max_price: 50000,
          sort: "newest",
          limit: 15,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchNewest);
  // 10. Test with category filter and in-stock combined
  const searchCategoryInStock =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          in_stock: true,
          sort: "newest",
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchCategoryInStock);
}
