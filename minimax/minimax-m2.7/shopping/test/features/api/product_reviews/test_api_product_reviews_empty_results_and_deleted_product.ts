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

export async function test_api_product_reviews_empty_results_and_deleted_product(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve reviews for a product that has no reviews
  // - Generate a random product UUID that doesn't exist in the system
  // - Verify endpoint returns empty data array with pagination showing 0 records and 0 pages
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const emptyReviewsResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: nonExistentProductId,
      body: typia.random<IEcommerceMallReview.IRequest>(),
    });
  typia.assert(emptyReviewsResponse);
  // Validate empty results structure
  TestValidator.equals(
    "data array should be empty",
    emptyReviewsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0",
    emptyReviewsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0",
    emptyReviewsResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page is valid",
    emptyReviewsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    emptyReviewsResponse.pagination.limit > 0,
  );
  // Test 2: Verify pagination metadata is correct for empty results
  // Even with explicit pagination parameters, empty product should return 0 records
  const paginatedRequest: IEcommerceMallReview.IRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const paginatedEmptyResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: nonExistentProductId,
      body: paginatedRequest,
    });
  typia.assert(paginatedEmptyResponse);
  // Verify pagination values are consistent
  TestValidator.equals(
    "paginated data array should be empty",
    paginatedEmptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "paginated records should be 0",
    paginatedEmptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated pages should be 0",
    paginatedEmptyResponse.pagination.pages,
    0,
  );
  // Test 3: Test with another random product ID (simulating deleted product)
  // According to spec, reviews should still be queryable for audit purposes
  // even if product doesn't exist/is deleted
  const anotherNonExistentProductId = typia.random<
    string & tags.Format<"uuid">
  >();
  const deletedProductResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: anotherNonExistentProductId,
      body: {},
    });
  typia.assert(deletedProductResponse);
  // Verify response structure is valid even for non-existent/deleted product
  TestValidator.equals(
    "deleted product data array should be empty",
    deletedProductResponse.data.length,
    0,
  );
  TestValidator.equals(
    "deleted product records should be 0",
    deletedProductResponse.pagination.records,
    0,
  );
}
