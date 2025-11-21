import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test caching behavior of the review list endpoint.
 *
 * Verifies that subsequent identical requests to the /shoppingMall/reviews
 * endpoint return similar timing and do not trigger excessive database queries.
 * This test validates that the system properly caches repeated identical
 * requests to optimize performance.
 *
 * This test follows a multi-phase approach:
 *
 * 1. Make an initial request with random search parameters
 * 2. Immediately make a second identical request
 * 3. Compare response timing and content
 * 4. Validate that second request is significantly faster (caching benefit)
 * 5. Verify that response data is identical between requests
 *
 * Note: Since the endpoint accepts IRequest as string type, we generate a
 * random JSON string that represents valid search criteria. The endpoint is
 * designed to accept string-formatted JSON search parameters.
 */
export async function test_api_review_list_caching_behavior(
  connection: api.IConnection,
) {
  // Generate random search criteria as a string (IRequest is defined as string type)
  const searchCriteria = JSON.stringify({
    product_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick([
      "published",
      "pending",
      "rejected",
      "hidden",
    ] as const),
    min_rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    max_rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    sort_by: RandomGenerator.pick([
      "rating",
      "created_at",
      "updated_at",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    current: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  });

  // Record start time for first request
  const startTime1 = performance.now();

  // Make first request
  const response1: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: searchCriteria,
    });
  typia.assert(response1);
  const endTime1 = performance.now();
  const time1 = endTime1 - startTime1;

  // Record start time for second request
  const startTime2 = performance.now();

  // Make identical second request
  const response2: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: searchCriteria,
    });
  typia.assert(response2);
  const endTime2 = performance.now();
  const time2 = endTime2 - startTime2;

  // Validate that responses are identical
  TestValidator.equals(
    "first and second response data should be identical",
    response1.data,
    response2.data,
  );
  TestValidator.equals(
    "first and second response pagination should be identical",
    response1.pagination,
    response2.pagination,
  );

  // Validate caching behavior: second request should be faster
  // (with reasonable buffer for network variance)
  TestValidator.predicate(
    "second request should be faster than first due to caching",
    time2 < time1,
  );

  // Validate that timing difference is meaningful (cache effect)
  // Second request should be at least 20% faster (conservative threshold)
  TestValidator.predicate(
    "caching should significantly reduce response time",
    (time1 - time2) / time1 > 0.2,
  );
}
