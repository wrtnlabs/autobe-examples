import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test advanced filtering capabilities for seller product reviews.
 * 1. Register and authenticate as a seller
 * 2. Test date range filtering (startDate and endDate)
 * 3. Test text search within review content
 * 4. Test combined filters (date range + search)
 * 5. Verify pagination works with filtered results
 */
export async function test_api_seller_reviews_my_products_filter_by_date_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test date range filtering
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = now.toISOString();
  const dateFilteredReviews =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          startDate,
          endDate,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(dateFilteredReviews);
  // Verify pagination structure
  TestValidator.equals(
    "date filter pagination current page",
    dateFilteredReviews.pagination.current,
    1,
  );
  TestValidator.equals(
    "date filter pagination limit",
    dateFilteredReviews.pagination.limit,
    20,
  );
  // 3. Test text search
  const searchKeyword = "great";
  const searchFilteredReviews =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: searchKeyword,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(searchFilteredReviews);
  // Verify search results structure
  TestValidator.equals(
    "search filter pagination current page",
    searchFilteredReviews.pagination.current,
    1,
  );
  // 4. Test combined filters (date range + search)
  const combinedFilteredReviews =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          startDate,
          endDate,
          search: searchKeyword,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(combinedFilteredReviews);
  // Verify combined filter results
  TestValidator.equals(
    "combined filter pagination current page",
    combinedFilteredReviews.pagination.current,
    1,
  );
  // 5. Test empty results with restrictive filters
  const futureStartDate = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year in future
  const emptyResults =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          startDate: futureStartDate,
          endDate: futureStartDate,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Verify empty results structure
  TestValidator.equals("empty results data array", emptyResults.data.length, 0);
  TestValidator.equals(
    "empty results pagination records",
    emptyResults.pagination.records,
    0,
  );
  // 6. Test pagination with filtered results
  const paginatedReviews =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
          startDate,
          endDate,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(paginatedReviews);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination page 2 current",
    paginatedReviews.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 limit",
    paginatedReviews.pagination.limit,
    10,
  );
}
