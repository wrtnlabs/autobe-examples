import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_reviews_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Basic pagination with default parameters
  const page1: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 10,
        isDeleted: false,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(page1);
  // Validate pagination metadata structure
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page1.pagination.pages >= 0,
  );
  // Validate review summary structure for each review
  for (const review of page1.data) {
    typia.assert(review);
    // Validate review fields
    TestValidator.predicate(
      "review has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.id,
      ),
    );
    TestValidator.predicate(
      "review rating is 1-5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review content is string or null",
      review.content === null || typeof review.content === "string",
    );
    TestValidator.predicate(
      "review createdAt is valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        review.createdAt,
      ),
    );
    TestValidator.predicate(
      "review isDeleted is boolean",
      typeof review.isDeleted === "boolean",
    );
    // Validate author summary structure
    typia.assert(review.author);
    TestValidator.predicate(
      "author has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.author.id,
      ),
    );
    TestValidator.predicate(
      "author email is valid",
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        review.author.email,
      ),
    );
    TestValidator.predicate(
      "author display_name is string or null",
      review.author.display_name === null ||
        typeof review.author.display_name === "string",
    );
    TestValidator.predicate(
      "author phone_number is string or null",
      review.author.phone_number === null ||
        typeof review.author.phone_number === "string",
    );
    TestValidator.predicate(
      "author account_status is valid",
      review.author.account_status === "active" ||
        review.author.account_status === "suspended" ||
        review.author.account_status === "banned",
    );
  }
  // Test 2: Pagination with different page size
  const page2: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(page2);
  TestValidator.equals(
    "pagination limit with pageSize 20",
    page2.pagination.limit,
    20,
  );
  // Test 3: Test with rating filter
  const ratingFilter: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 10,
        rating: 5,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(ratingFilter);
  // All reviews should have rating 5
  for (const review of ratingFilter.data) {
    TestValidator.equals("filtered review has rating 5", review.rating, 5);
  }
  // Test 4: Test with sorting by rating
  const sortByRating: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 10,
        sortBy: "rating",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(sortByRating);
  // Test 5: Test with date range filter
  const dateRange: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 10,
        startDate: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: new Date().toISOString(),
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(dateRange);
  // Test 6: Verify pagination calculation
  const largePage: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 2,
        pageSize: 5,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(largePage);
  TestValidator.equals(
    "pagination current page 2",
    largePage.pagination.current,
    2,
  );
}
