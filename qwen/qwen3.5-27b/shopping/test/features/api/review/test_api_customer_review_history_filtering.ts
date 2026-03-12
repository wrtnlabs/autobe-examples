import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test advanced filtering capabilities for customer review history.
 * Validates rating filter, date range filter, text search, and pagination with filters.
 */
export async function test_api_customer_review_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test rating filter (rating=5)
  const ratingFilterResult =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          rating: 5,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(ratingFilterResult);
  TestValidator.equals(
    "rating filter returns paginated response",
    ratingFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all reviews have rating 5",
    ratingFilterResult.data.every((review) => review.rating === 5),
  );
  // 3. Test date range filter
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = new Date();
  const dateRangeResult =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns paginated response",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "reviews within date range",
    dateRangeResult.data.every(
      (review) =>
        new Date(review.created_at) >= startDate &&
        new Date(review.created_at) <= endDate,
    ),
  );
  // 4. Test pagination with filters
  const paginationResult =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          rating: 3,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginationResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination records matches data length for single page",
    paginationResult.pagination.records,
    paginationResult.data.length,
  );
  // 5. Test empty result set (filter with no matches)
  const emptyResult =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          rating: 5,
          search: "nonexistent_keyword_xyz_12345",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // 6. Test text search filter
  const searchResult =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: "test",
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "text search returns paginated response",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search results contain keyword in content",
    searchResult.data.every(
      (review) =>
        review.content === null ||
        review.content === undefined ||
        review.content.toLowerCase().includes("test"),
    ),
  );
  // 7. Test combined filters (rating + pagination)
  const combinedFilterResult =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
          rating: 4,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter pagination current",
    combinedFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter pagination limit",
    combinedFilterResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined filter all reviews have rating 4",
    combinedFilterResult.data.every((review) => review.rating === 4),
  );
  TestValidator.predicate(
    "combined filter data count within limit",
    combinedFilterResult.data.length <= 5,
  );
}
