import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_public_filtering_by_product_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // This is a public API endpoint (no authentication required)
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate random UUID for product filter
  const productId = typia.random<string & tags.Format<"uuid">>();
  const minRating = 4;
  const maxRating = 5;
  const limit = 20;
  // Step 1 & 2: Request reviews with productId and rating filters (4-5 stars)
  const response = await api.functional.ecommerceMall.reviews.index(
    baseConnection,
    {
      body: {
        productId,
        customerId: null,
        minRating,
        maxRating,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  // Step 3: Verify response structure using typia.assert (validates complete type)
  typia.assert(response);
  // Step 4: Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination.current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // Step 5: Validate data array and each review structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  for (const review of response.data) {
    // Validate review has required structure (typia.assert validates id, rating, content, customer, product, createdAt)
    typia.assert(review);
    // Validate rating is within the requested filter range (4-5)
    TestValidator.predicate(
      `review rating ${review.rating} is >= ${minRating}`,
      review.rating >= minRating,
    );
    TestValidator.predicate(
      `review rating ${review.rating} is <= ${maxRating}`,
      review.rating <= maxRating,
    );
    // Validate productId matches filter when review is returned
    TestValidator.equals(
      "review product.id matches filter",
      review.product.id,
      productId,
    );
  }
  // Step 6: Verify sorting - newest first (createdAt descending)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentCreatedAt = new Date(response.data[i]!.createdAt).getTime();
      const nextCreatedAt = new Date(response.data[i + 1]!.createdAt).getTime();
      TestValidator.predicate(
        `review at index ${i} createdAt >= review at index ${i + 1} createdAt (newest first)`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // Step 7: Test with different rating range and verify empty results are handled correctly
  const lowRatingResponse = await api.functional.ecommerceMall.reviews.index(
    baseConnection,
    {
      body: {
        productId: typia.random<string & tags.Format<"uuid">>(),
        customerId: null,
        minRating: 1,
        maxRating: 2,
        createdAfter: null,
        createdBefore: null,
        search: null,
        sort: "newest",
        includeDeleted: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(lowRatingResponse);
  TestValidator.predicate(
    "low rating filter response has valid pagination",
    lowRatingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "low rating filter response data is array",
    Array.isArray(lowRatingResponse.data),
  );
}
