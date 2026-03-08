import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_product_reviews_list(
  connection: api.IConnection,
): Promise<void> {
  // Test: Browse product reviews with pagination and filtering
  // This tests the primary use case: customers viewing product reviews
  // Test 1: Default pagination (no filters)
  const result1 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {} satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(result1);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is number",
    typeof result1.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof result1.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof result1.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof result1.pagination.pages,
    "number",
  );
  // Validate pagination constraints
  TestValidator.predicate(
    "pagination current is non-negative",
    result1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    result1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result1.pagination.pages >= 0,
  );
  // Validate reviews data structure
  for (const review of result1.data) {
    typia.assert(review);
    // Review ID validation
    TestValidator.equals(
      "review has valid UUID format",
      typeof review.id,
      "string",
    );
    // UUID format check using pattern
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.equals(
      "review ID matches UUID pattern",
      uuidPattern.test(review.id),
      true,
    );
    // Rating validation (1-5)
    TestValidator.equals(
      "review rating is number",
      typeof review.rating,
      "number",
    );
    TestValidator.equals(
      "review rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
      true,
    );
    // Text content validation
    TestValidator.equals(
      "review text content is string or null",
      review.textContent === null || typeof review.textContent === "string",
      true,
    );
    // Customer validation
    TestValidator.equals(
      "review has customer object",
      review.customer !== null && review.customer !== undefined,
      true,
    );
    typia.assert(review.customer);
    TestValidator.equals(
      "customer has valid UUID",
      typeof review.customer.id,
      "string",
    );
    TestValidator.equals(
      "customer email is valid format",
      typeof review.customer.email,
      "string",
    );
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    TestValidator.equals(
      "customer email matches email pattern",
      emailPattern.test(review.customer.email),
      true,
    );
    // Customer profile validation
    TestValidator.equals(
      "customer has profile",
      review.customer.customerProfile !== null &&
        review.customer.customerProfile !== undefined,
      true,
    );
    typia.assert(review.customer.customerProfile);
    TestValidator.equals(
      "customer profile has display name",
      typeof review.customer.customerProfile.displayName,
      "string",
    );
    // Product validation
    TestValidator.equals(
      "review has product object",
      review.product !== null && review.product !== undefined,
      true,
    );
    typia.assert(review.product);
    TestValidator.equals(
      "product has valid ID",
      typeof review.product.id,
      "string",
    );
    TestValidator.equals(
      "product has name",
      typeof review.product.name,
      "string",
    );
    TestValidator.equals(
      "product has base price",
      typeof review.product.base_price,
      "number",
    );
    // Status fields
    TestValidator.equals(
      "review isActive is boolean",
      typeof review.isActive,
      "boolean",
    );
    TestValidator.equals(
      "review has createdAt timestamp",
      typeof review.createdAt,
      "string",
    );
    TestValidator.equals(
      "review createdAt is valid ISO 8601 format",
      !Number.isNaN(Date.parse(review.createdAt)),
      true,
    );
    TestValidator.equals(
      "review has updatedAt timestamp",
      typeof review.updatedAt,
      "string",
    );
    TestValidator.equals(
      "review deletedAt is null or date string",
      review.deletedAt === null || typeof review.deletedAt === "string",
      true,
    );
  }
  // Test 2: Filter by product ID
  const productId = "123e4567-e89b-12d3-a456-426614174000" as string &
    tags.Format<"uuid">;
  const result2 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      productId: productId,
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(result2);
  // Validate that all returned reviews are for the specified product
  if (result2.data.length > 0) {
    for (const review of result2.data) {
      TestValidator.equals(
        "returned review product matches filter",
        review.product.id,
        productId,
      );
    }
  }
  // Test 3: Custom pagination parameters
  const result3 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      page: 2,
      pageSize: 10,
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(result3);
  // Validate custom pagination is respected
  TestValidator.equals(
    "custom page number is used",
    result3.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom page size is used",
    result3.pagination.limit,
    10,
  );
  // Test 4: Sorting by rating
  const result4 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      sortBy: "rating",
      sortOrder: "desc",
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(result4);
  // Test 5: Rating range filter
  const result5 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      ratingMin: 4,
      ratingMax: 5,
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(result5);
  // Validate all reviews in filtered result have ratings in range
  for (const review of result5.data) {
    TestValidator.equals(
      "filtered reviews have rating >= 4",
      review.rating >= 4,
      true,
    );
    TestValidator.equals(
      "filtered reviews have rating <= 5",
      review.rating <= 5,
      true,
    );
  }
  // Test 6: Search text filter
  const searchResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        searchText: "test",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 7: Limit parameter (max records per page)
  const limitResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        limit: 50,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(limitResult);
  // Validate limit parameter is respected (should not exceed actual page size limit)
  TestValidator.predicate(
    "limit value is non-negative",
    limitResult.pagination.limit >= 0,
  );
  // Test 8: Date range filter
  const dateRange = new Date();
  const result8 = await api.functional.ecommerceMall.reviews.index(connection, {
    body: {
      createdAtFrom: dateRange.toISOString(),
    } satisfies IEcommerceMallReview.IRequest,
  });
  typia.assert(result8);
}
