import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAnalytic";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_analytics_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>(),
    });
  typia.assert(customer);
  // 2. Test Empty Data Scenario - Future date range with no records
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const emptyDataResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          start_date: futureDate.toISOString(),
          end_date: new Date(
            Date.now() + 366 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(emptyDataResponse);
  TestValidator.equals(
    "empty data - total orders is zero",
    emptyDataResponse.data[0].data.orders.totalOrders,
    0,
  );
  TestValidator.equals(
    "empty data - total revenue is zero",
    emptyDataResponse.data[0].data.orders.totalRevenue,
    0,
  );
  TestValidator.equals(
    "empty data - average order value is zero",
    emptyDataResponse.data[0].data.orders.averageOrderValue,
    0,
  );
  TestValidator.equals(
    "empty data - total products is zero",
    emptyDataResponse.data[0].data.products.totalProducts,
    0,
  );
  TestValidator.equals(
    "empty data - total customers is zero",
    emptyDataResponse.data[0].data.customers.totalCustomers,
    0,
  );
  TestValidator.equals(
    "empty data - total sellers is zero",
    emptyDataResponse.data[0].data.sellers.totalSellers,
    0,
  );
  TestValidator.equals(
    "empty data - total reviews is zero",
    emptyDataResponse.data[0].data.reviews.totalReviews,
    0,
  );
  TestValidator.equals(
    "empty data - pagination records is zero",
    emptyDataResponse.data[0].pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data - pagination pages is zero",
    emptyDataResponse.data[0].pagination.pages,
    0,
  );
  // 3. Test Seller Edge Cases - Non-existent seller (no products)
  const nonExistentSellerId = "00000000-0000-0000-0000-000000000000";
  const sellerNoProductsResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          seller_id: nonExistentSellerId,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(sellerNoProductsResponse);
  TestValidator.equals(
    "seller no products - total products is zero",
    sellerNoProductsResponse.data[0].data.products.totalProducts,
    0,
  );
  // 4. Test Category Edge Cases - Non-existent category (no products)
  const nonExistentCategoryId = "11111111-1111-1111-1111-111111111111";
  const categoryNoProductsResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          category_id: nonExistentCategoryId,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(categoryNoProductsResponse);
  TestValidator.equals(
    "category no products - total products is zero",
    categoryNoProductsResponse.data[0].data.products.totalProducts,
    0,
  );
  // 5. Test Text Search Edge Cases
  // 5a. Search term that matches nothing
  const noMatchSearch = "nonexistentxyz123";
  const noMatchSearchResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          search: noMatchSearch,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(noMatchSearchResponse);
  TestValidator.equals(
    "no match search - total orders is zero",
    noMatchSearchResponse.data[0].data.orders.totalOrders,
    0,
  );
  // 5b. Common word search (partial match)
  const commonWordSearch = "the";
  const partialMatchSearchResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          search: commonWordSearch,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(partialMatchSearchResponse);
  // 6. Test Invalid Filter Combinations - Conflicting filters
  const conflictingCategoryId = "22222222-2222-2222-2222-222222222222";
  const conflictingProductId = "33333333-3333-3333-3333-333333333333";
  const conflictingFiltersResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          category_id: conflictingCategoryId,
          product_id: conflictingProductId,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(conflictingFiltersResponse);
  // 7. Test Large Dataset Handling - Maximum pagination limit
  const maxLimitResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit - pagination limit is 100",
    maxLimitResponse.data[0].pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit - pagination records is non-negative",
    () => maxLimitResponse.data[0].pagination.records >= 0,
  );
}
