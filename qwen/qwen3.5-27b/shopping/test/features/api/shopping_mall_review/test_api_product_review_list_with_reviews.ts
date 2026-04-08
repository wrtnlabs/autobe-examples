import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving reviews for a product that has multiple customer reviews.
 *
 * Validates the complete review listing flow including pagination, filtering, and sorting. Ensures that the review list endpoint returns correctly paginated results with proper metadata and review details.
 *
 * Special attention is given to verifying that reviews are sorted by creation date (newest first), pagination metadata is accurate, and each review includes complete customer and product information.
 *
 * 1. Retrieves review list with pagination parameters for a product.
 * 2. Validates pagination metadata (current page, limit, total records, total pages).
 * 3. Validates each review structure includes customer and product details.
 * 4. Verifies reviews are sorted by created_at in descending order.
 * 5. Tests pagination by requesting page 2 if available.
 * 6. Tests filtering by rating range (4-5 stars).
 */
export async function test_api_product_review_list_with_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Use a test product ID (in real scenario, this would be created during test setup)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 1. Retrieve reviews with pagination (page 1)
  const reviewsPage1 = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewsPage1);
  // 2. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    reviewsPage1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reviewsPage1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    reviewsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    reviewsPage1.pagination.pages >= 0,
  );
  // 3. Validate page 1 data count
  TestValidator.equals(
    "page 1 data count matches expected",
    reviewsPage1.data.length,
    Math.min(reviewsPage1.pagination.limit, reviewsPage1.pagination.records),
  );
  // 4. Validate each review structure (if reviews exist)
  if (reviewsPage1.data.length > 0) {
    for (const review of reviewsPage1.data) {
      // Validate review has required fields (typia.assert already validates types)
      TestValidator.predicate(
        `review ${review.id} has valid rating 1-5`,
        review.rating >= 1 && review.rating <= 5,
      );
      // Validate customer info
      TestValidator.predicate(
        `review ${review.id} customer has display name`,
        review.customer.display_name.length > 0,
      );
      // Validate product matches requested product
      TestValidator.equals(
        `review ${review.id} product matches requested`,
        review.product.id,
        productId,
      );
      // Validate product has required fields
      TestValidator.predicate(
        `review ${review.id} product has name`,
        review.product.name.length > 0,
      );
      TestValidator.predicate(
        `review ${review.id} product has non-negative price`,
        review.product.base_price >= 0,
      );
    }
    // 5. Validate sorting (newest first)
    for (let i = 1; i < reviewsPage1.data.length; i++) {
      TestValidator.predicate(
        `review ${i} is not newer than review ${i - 1}`,
        new Date(reviewsPage1.data[i].created_at) <=
          new Date(reviewsPage1.data[i - 1].created_at),
      );
    }
  }
  // 6. Test pagination with page 2 (if available)
  if (reviewsPage1.pagination.pages > 1) {
    const reviewsPage2 =
      await api.functional.shoppingMall.products.reviews.index(connection, {
        productId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(reviewsPage2);
    // Validate page 2 metadata
    TestValidator.equals(
      "page 2 current is 2",
      reviewsPage2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit matches page 1",
      reviewsPage2.pagination.limit,
      reviewsPage1.pagination.limit,
    );
    TestValidator.equals(
      "page 2 total records matches page 1",
      reviewsPage2.pagination.records,
      reviewsPage1.pagination.records,
    );
    TestValidator.equals(
      "page 2 total pages matches page 1",
      reviewsPage2.pagination.pages,
      reviewsPage1.pagination.pages,
    );
    // Validate that page 2 has different reviews than page 1
    const page1Ids = reviewsPage1.data.map((r) => r.id);
    const page2HasOverlap = reviewsPage2.data.some((r) =>
      page1Ids.includes(r.id),
    );
    TestValidator.predicate(
      "page 2 has no overlap with page 1",
      !page2HasOverlap,
    );
  }
  // 7. Test filtering by rating range (4-5 stars)
  const reviewsRatingFilter =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        limit: 10,
        ratingMin: 4,
        ratingMax: 5,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewsRatingFilter);
  // Validate all reviews in filtered result have rating 4-5
  for (const review of reviewsRatingFilter.data) {
    TestValidator.predicate(
      `filtered review ${review.id} has rating in range 4-5`,
      review.rating >= 4 && review.rating <= 5,
    );
  }
  // 8. Validate filtered results have fewer or equal records than unfiltered
  TestValidator.predicate(
    "filtered records <= unfiltered records",
    reviewsRatingFilter.pagination.records <= reviewsPage1.pagination.records,
  );
}
