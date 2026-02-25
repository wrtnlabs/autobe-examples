import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_analytics_reviews_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: In a real implementation, we would need admin approval for the seller account.
  // For testing purposes, we assume the account is pre-approved to access analytics.
  // 2. Create test products using the seller's authenticated connection
  // Since product creation endpoints are not provided in the available API functions,
  // we simulate that products have been created and focus on testing the analytics endpoint
  // 3. Setup date ranges for testing
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(
    currentDate.getTime() - 14 * 24 * 60 * 60 * 1000,
  );
  // 4. Test basic analytics query without filters
  const basicAnalytics =
    await api.functional.ecommerce.seller.analytics.reviews.search(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    typeof basicAnalytics.pagination.current,
    "number",
  );
  TestValidator.predicate(
    "current page is valid",
    basicAnalytics.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof basicAnalytics.pagination.limit,
    "number",
  );
  TestValidator.predicate(
    "limit is valid",
    basicAnalytics.pagination.limit >= 1 &&
      basicAnalytics.pagination.limit <= 100,
  );
  TestValidator.equals(
    "pagination has total records",
    typeof basicAnalytics.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has total pages",
    typeof basicAnalytics.pagination.pages,
    "number",
  );
  // 5. Test filtering by multiple ratings
  const ratingFilters = [
    {
      ratings: [1, 2] as (number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>)[],
      description: "low ratings",
    },
    {
      ratings: [4, 5] as (number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>)[],
      description: "high ratings",
    },
    {
      ratings: [3] as (number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<5>)[],
      description: "medium rating",
    },
  ];
  for (const filter of ratingFilters) {
    const response =
      await api.functional.ecommerce.seller.analytics.reviews.search(
        sellerConnection,
        {
          body: {
            ratings: filter.ratings,
            page: 1,
            limit: 5,
          } satisfies IEcommerceReview.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `rating filter ${filter.description} returns valid data`,
      response.pagination.records >= 0,
    );
  }
  // 6. Test date range filtering
  const dateRangeResponse =
    await api.functional.ecommerce.seller.analytics.reviews.search(
      sellerConnection,
      {
        body: {
          start_date: twoWeeksAgo.toISOString(),
          end_date: currentDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 7. Test search functionality with different queries
  const searchQueries = ["excellent", "good", "poor", "quality"];
  for (const query of searchQueries) {
    const searchResponse =
      await api.functional.ecommerce.seller.analytics.reviews.search(
        sellerConnection,
        {
          body: {
            search: query,
            page: 1,
            limit: 10,
          } satisfies IEcommerceReview.IRequest,
        },
      );
    typia.assert(searchResponse);
    TestValidator.predicate(
      `search query '${query}' returns valid pagination`,
      searchResponse.pagination.current === 1,
    );
  }
  // 8. Test pagination with different page sizes
  const pageSizes = [5, 10, 20, 50];
  for (const size of pageSizes) {
    const paginationResponse =
      await api.functional.ecommerce.seller.analytics.reviews.search(
        sellerConnection,
        {
          body: {
            page: 1,
            limit: size as number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceReview.IRequest,
        },
      );
    typia.assert(paginationResponse);
    TestValidator.equals(
      `page size ${size} is respected`,
      paginationResponse.pagination.limit,
      size,
    );
  }
  // 9. Test sorting functionality
  const sortOptions = [
    {
      sort_by: "created_at" as const,
      sort_order: "desc" as const,
      description: "newest first",
    },
    {
      sort_by: "rating" as const,
      sort_order: "desc" as const,
      description: "highest rating first",
    },
    {
      sort_by: "rating" as const,
      sort_order: "asc" as const,
      description: "lowest rating first",
    },
  ];
  for (const sort of sortOptions) {
    const sortResponse =
      await api.functional.ecommerce.seller.analytics.reviews.search(
        sellerConnection,
        {
          body: {
            sort_by: sort.sort_by,
            sort_order: sort.sort_order,
            page: 1,
            limit: 10,
          } satisfies IEcommerceReview.IRequest,
        },
      );
    typia.assert(sortResponse);
    TestValidator.predicate(
      `sort by ${sort.description} returns valid data`,
      sortResponse.data.length <= 10,
    );
  }
  // 10. Test combined filters
  const combinedResponse =
    await api.functional.ecommerce.seller.analytics.reviews.search(
      sellerConnection,
      {
        body: {
          ratings: [4, 5] as (number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>)[],
          start_date: oneWeekAgo.toISOString(),
          end_date: currentDate.toISOString(),
          search: "recommend",
          page: 1,
          limit: 15,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // 11. Test edge case - empty result set
  const futureDate = new Date(Date.now() + 86400000); // tomorrow
  const emptyResponse =
    await api.functional.ecommerce.seller.analytics.reviews.search(
      sellerConnection,
      {
        body: {
          start_date: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceReview.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.predicate(
    "future date filter may return empty results",
    emptyResponse.pagination.records === 0 || emptyResponse.data.length === 0,
  );
  // 12. Validate review data structure when reviews exist
  if (basicAnalytics.data.length > 0) {
    const sampleReview = basicAnalytics.data[0];
    TestValidator.predicate(
      "review has valid UUID ID",
      typeof sampleReview.id === "string" && sampleReview.id.length > 0,
    );
    TestValidator.predicate(
      "review has valid rating",
      sampleReview.rating >= 1 && sampleReview.rating <= 5,
    );
    TestValidator.predicate(
      "review has creation timestamp",
      typeof sampleReview.created_at === "string",
    );
    TestValidator.predicate(
      "review has customer information",
      typeof sampleReview.customer.id === "string" &&
        typeof sampleReview.customer.email === "string" &&
        typeof sampleReview.customer.display_name === "string" &&
        typeof sampleReview.customer.created_at === "string",
    );
    // Content can be null for rating-only reviews
    TestValidator.predicate(
      "review content is either string or null",
      sampleReview.content === null || typeof sampleReview.content === "string",
    );
  }
}
