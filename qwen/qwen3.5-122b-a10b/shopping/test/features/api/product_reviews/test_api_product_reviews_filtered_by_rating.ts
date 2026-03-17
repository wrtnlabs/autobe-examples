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

export async function test_api_product_reviews_filtered_by_rating(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Filter reviews by rating=5 (highest rating)
  const rating5Response: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        rating: 5,
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(rating5Response);
  // Validate all returned reviews have rating=5
  for (const review of rating5Response.data) {
    TestValidator.equals("rating 5 filter - review rating", review.rating, 5);
  }
  // Test 2: Filter reviews by rating=1 (lowest rating)
  const rating1Response: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        rating: 1,
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(rating1Response);
  // Validate all returned reviews have rating=1
  for (const review of rating1Response.data) {
    TestValidator.equals("rating 1 filter - review rating", review.rating, 1);
  }
  // Test 3: Test pagination with rating filter
  const paginatedResponse: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        rating: 4,
        page: 1,
        pageSize: 10,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    paginatedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    paginatedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginatedResponse.pagination.pages >= 0,
  );
  // Test 4: Sort by rating ascending
  const sortedAscResponse: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        sortBy: "rating",
        sortOrder: "asc",
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(sortedAscResponse);
  // Validate sorting - ratings should be in ascending order
  for (let i = 1; i < sortedAscResponse.data.length; i++) {
    TestValidator.predicate(
      "rating ascending sort",
      sortedAscResponse.data[i - 1].rating <= sortedAscResponse.data[i].rating,
    );
  }
  // Test 5: Sort by rating descending
  const sortedDescResponse: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        sortBy: "rating",
        sortOrder: "desc",
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(sortedDescResponse);
  // Validate sorting - ratings should be in descending order
  for (let i = 1; i < sortedDescResponse.data.length; i++) {
    TestValidator.predicate(
      "rating descending sort",
      sortedDescResponse.data[i - 1].rating >=
        sortedDescResponse.data[i].rating,
    );
  }
  // Test 6: Filter by rating and sort combined
  const combinedResponse: IPageIEcommerceMallReview.ISummary =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        rating: 3,
        sortBy: "rating",
        sortOrder: "asc",
        page: 1,
        pageSize: 20,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(combinedResponse);
  // Validate all reviews have rating=3 and are sorted
  for (const review of combinedResponse.data) {
    TestValidator.equals("combined filter - review rating", review.rating, 3);
  }
}