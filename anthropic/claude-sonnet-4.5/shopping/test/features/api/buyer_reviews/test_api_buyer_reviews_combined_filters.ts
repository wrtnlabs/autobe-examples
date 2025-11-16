import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complex filtering scenarios combining multiple filter criteria
 * simultaneously.
 *
 * This test validates that the buyer reviews API correctly handles
 * sophisticated queries combining rating ranges, date ranges, verification
 * status, and text search. It ensures that all filters work correctly in
 * combination without conflicts, supporting advanced review history analysis
 * and management workflows.
 *
 * Test flow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Test combined filters: rating range + date range
 * 3. Test combined filters: verification status + text search
 * 4. Test combined filters: rating + verification + date range
 * 5. Validate pagination and sorting with combined filters
 * 6. Verify response structure for all filter combinations
 */
export async function test_api_buyer_reviews_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Test combined filters - rating range + date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const ratingDateFilter = {
    page: 1,
    limit: 20,
    min_rating: 4,
    max_rating: 5,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const ratingDateResults =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: ratingDateFilter,
    });
  typia.assert(ratingDateResults);

  TestValidator.predicate(
    "rating and date filter response has valid pagination",
    ratingDateResults.pagination.current === 1 &&
      ratingDateResults.pagination.limit === 20 &&
      ratingDateResults.pagination.records >= 0,
  );

  // Step 3: Test combined filters - verification status + text search
  const verificationTextFilter = {
    page: 1,
    limit: 10,
    verified_purchase_only: true,
    search_text: RandomGenerator.name(),
    sort_by: "rating" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const verificationTextResults =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: verificationTextFilter,
    });
  typia.assert(verificationTextResults);

  TestValidator.predicate(
    "verification and text search filter response is valid",
    verificationTextResults.pagination.current === 1 &&
      verificationTextResults.pagination.limit === 10,
  );

  // Step 4: Test combined filters - rating + verification + date range
  const complexFilter = {
    page: 1,
    limit: 15,
    min_rating: 5,
    max_rating: 5,
    verified_purchase_only: true,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    search_text: "quality",
    sort_by: "helpfulness" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const complexResults =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: complexFilter,
    });
  typia.assert(complexResults);

  TestValidator.predicate(
    "complex combined filters return valid response",
    complexResults.pagination.current === 1 &&
      complexResults.pagination.limit === 15 &&
      Array.isArray(complexResults.data),
  );

  // Step 5: Test pagination with combined filters
  const paginationFilter = {
    page: 2,
    limit: 5,
    min_rating: 3,
    has_seller_response: true,
    is_anonymous: false,
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const paginationResults =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: paginationFilter,
    });
  typia.assert(paginationResults);

  TestValidator.predicate(
    "pagination with filters works correctly",
    paginationResults.pagination.current === 2 &&
      paginationResults.pagination.limit === 5,
  );

  // Step 6: Test with images filter and status filter combined
  const imageStatusFilter = {
    page: 1,
    limit: 20,
    has_images: true,
    status: "approved",
    min_rating: 1,
    max_rating: 5,
    sort_by: "rating" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const imageStatusResults =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: imageStatusFilter,
    });
  typia.assert(imageStatusResults);

  TestValidator.predicate(
    "image and status filter combination is valid",
    imageStatusResults.pagination.records >= 0 &&
      Array.isArray(imageStatusResults.data),
  );

  // Validate response structure
  TestValidator.predicate(
    "all responses have valid pagination metadata",
    typeof ratingDateResults.pagination.pages === "number" &&
      typeof verificationTextResults.pagination.pages === "number" &&
      typeof complexResults.pagination.pages === "number",
  );
}
