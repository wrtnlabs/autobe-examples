import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test review listing endpoint pagination functionality.
 *
 * Verifies correct page navigation, record counting across multiple pages,
 * filtering by rating, and empty result handling.
 */
export async function test_api_review_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Get first page with limit 5
  const page1 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      page: 1,
      limit: 5,
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(page1);
  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has records or is empty",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has valid pages",
    page1.pagination.pages >= 0,
  );
  // If we have reviews, validate data count and page calculation
  if (page1.pagination.records > 0) {
    TestValidator.equals(
      "page 1 data count",
      page1.data.length,
      Math.min(5, page1.pagination.records),
    );
    // Step 2: Get second page with same limit
    const page2 = await api.functional.ecommerceMall.reviews.index(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallReview.IRequest,
    });
    typia.assert(page2);
    // Validate page 2 pagination
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
    TestValidator.equals(
      "page 2 same total records",
      page2.pagination.records,
      page1.pagination.records,
    );
    // Verify pages calculation: Math.ceil(records / limit)
    const expectedPages = Math.ceil(page1.pagination.records / 5);
    TestValidator.equals(
      "pages calculation correct",
      page2.pagination.pages,
      expectedPages,
    );
    // If there are more than 5 reviews, pages should be >= 2
    if (page1.pagination.records > 5) {
      TestValidator.predicate("has page 2 data", page2.data.length > 0);
      // Step 3: Verify page 1 and page 2 have different data
      const page1Ids = new Set(page1.data.map((r) => r.id));
      const page2Ids = new Set(page2.data.map((r) => r.id));
      TestValidator.predicate(
        "pages have different review IDs",
        !page1.data.some((r) => page2Ids.has(r.id)),
      );
    }
    // Step 4: Test limit 100 (max allowed)
    const allReviews = await api.functional.ecommerceMall.reviews.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
    typia.assert(allReviews);
    TestValidator.equals("max limit applied", allReviews.pagination.limit, 100);
    TestValidator.equals(
      "same total records",
      allReviews.pagination.records,
      page1.pagination.records,
    );
    // If records <= 100, all should fit on single page
    if (allReviews.pagination.records <= 100) {
      TestValidator.equals(
        "single page when under max",
        allReviews.pagination.pages,
        1,
      );
    }
    // Step 5: Filter by 5-star rating only
    const fiveStarReviews = await api.functional.ecommerceMall.reviews.index(
      connection,
      {
        body: {
          ratingMin: 5,
          ratingMax: 5,
          limit: 100,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
    typia.assert(fiveStarReviews);
    // Verify all returned reviews are 5-star
    for (const review of fiveStarReviews.data) {
      TestValidator.equals("rating is 5-star", review.rating, 5);
    }
    // Five-star reviews should be <= total reviews
    TestValidator.predicate(
      "5-star count <= total",
      fiveStarReviews.pagination.records <= page1.pagination.records,
    );
  }
  // Step 6: Test with non-existent productId
  const nonExistentProduct = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        productId: typia.random<string & tags.Format<"uuid">>(),
        limit: 100,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(nonExistentProduct);
  // Empty results validation
  TestValidator.equals("empty data array", nonExistentProduct.data.length, 0);
  TestValidator.equals(
    "zero records",
    nonExistentProduct.pagination.records,
    0,
  );
  TestValidator.equals("zero pages", nonExistentProduct.pagination.pages, 0);
  TestValidator.equals(
    "current still reflects page",
    nonExistentProduct.pagination.current,
    1,
  );
}
