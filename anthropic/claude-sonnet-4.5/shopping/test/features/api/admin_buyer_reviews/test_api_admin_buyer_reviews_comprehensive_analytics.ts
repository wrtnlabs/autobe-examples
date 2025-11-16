import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin capabilities to perform comprehensive buyer review analytics.
 *
 * This test validates that administrators can execute sophisticated analytical
 * queries on buyer reviews using multiple filter combinations and sorting
 * options. The test ensures the platform supports complex data analysis for
 * business intelligence, quality monitoring, and platform improvement
 * initiatives.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Execute analytical query with high-rating verified purchase filters
 * 3. Execute analytical query with low-rating unverified review filters
 * 4. Test rating range filtering with temporal constraints
 * 5. Validate sorting options (creation date, rating, helpfulness)
 * 6. Verify pagination functionality with filtered results
 * 7. Validate response structure and data integrity
 */
export async function test_api_admin_buyer_reviews_comprehensive_analytics(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for analytics operations
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Generate a random buyer ID for analytical queries
  const buyerId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Query high-rating verified purchase reviews with images
  const highRatingVerifiedQuery = {
    page: 1,
    limit: 20,
    min_rating: 4,
    max_rating: 5,
    verified_purchase_only: true,
    has_images: true,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const highRatingResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: highRatingVerifiedQuery,
    });
  typia.assert(highRatingResults);

  // Validate pagination structure
  TestValidator.predicate(
    "high rating query returns valid pagination",
    highRatingResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "high rating query has valid limit",
    highRatingResults.pagination.limit === 20,
  );
  TestValidator.predicate(
    "high rating query records count is non-negative",
    highRatingResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "high rating query pages count is non-negative",
    highRatingResults.pagination.pages >= 0,
  );

  // Step 3: Query low-rating unverified reviews without seller responses
  const lowRatingUnverifiedQuery = {
    page: 1,
    limit: 15,
    min_rating: 1,
    max_rating: 2,
    verified_purchase_only: false,
    has_seller_response: false,
    sort_by: "rating" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const lowRatingResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: lowRatingUnverifiedQuery,
    });
  typia.assert(lowRatingResults);

  // Validate pagination for low rating query
  TestValidator.equals(
    "low rating query page number",
    lowRatingResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "low rating query limit",
    lowRatingResults.pagination.limit,
    15,
  );

  // Step 4: Query with temporal filtering - recent reviews
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const temporalQuery = {
    page: 1,
    limit: 25,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const temporalResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: temporalQuery,
    });
  typia.assert(temporalResults);

  TestValidator.predicate(
    "temporal query returns valid pagination",
    temporalResults.pagination.current === 1,
  );

  // Step 5: Query with moderation status filter
  const moderationStatusQuery = {
    page: 1,
    limit: 10,
    status: RandomGenerator.pick([
      "pending_moderation",
      "approved",
      "rejected",
    ]),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const moderationResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: moderationStatusQuery,
    });
  typia.assert(moderationResults);

  TestValidator.predicate(
    "moderation query has valid structure",
    Array.isArray(moderationResults.data),
  );

  // Step 6: Query with helpfulness sorting
  const helpfulnessQuery = {
    page: 1,
    limit: 30,
    sort_by: "helpfulness" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const helpfulnessResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: helpfulnessQuery,
    });
  typia.assert(helpfulnessResults);

  TestValidator.predicate(
    "helpfulness sorting query succeeds",
    helpfulnessResults.pagination.limit === 30,
  );

  // Step 7: Query with text search
  const searchQuery = {
    page: 1,
    limit: 20,
    search_text: RandomGenerator.paragraph({ sentences: 2 }),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const searchResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: searchQuery,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search query returns valid results",
    Array.isArray(searchResults.data),
  );

  // Step 8: Test pagination - page 2
  const paginationQuery = {
    page: 2,
    limit: 10,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const page2Results =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: paginationQuery,
    });
  typia.assert(page2Results);

  TestValidator.equals(
    "pagination page 2 current value",
    page2Results.pagination.current,
    2,
  );

  // Step 9: Query with anonymous filter
  const anonymousQuery = {
    page: 1,
    limit: 20,
    is_anonymous: true,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const anonymousResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: anonymousQuery,
    });
  typia.assert(anonymousResults);

  TestValidator.predicate(
    "anonymous filter query succeeds",
    anonymousResults.pagination.records >= 0,
  );

  // Step 10: Combined complex filter - analytics scenario
  const complexAnalyticsQuery = {
    page: 1,
    limit: 50,
    min_rating: 3,
    max_rating: 5,
    verified_purchase_only: true,
    has_seller_response: true,
    has_images: true,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    sort_by: "helpfulness" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const complexResults =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: complexAnalyticsQuery,
    });
  typia.assert(complexResults);

  // Validate complex query results structure
  TestValidator.predicate(
    "complex analytics query has valid pagination",
    complexResults.pagination.current === 1 &&
      complexResults.pagination.limit === 50,
  );

  TestValidator.predicate(
    "complex analytics query data is array",
    Array.isArray(complexResults.data),
  );

  // Validate that data items conform to ISummary structure if present
  if (complexResults.data.length > 0) {
    const firstReview = complexResults.data[0];
    typia.assert(firstReview);

    TestValidator.predicate(
      "review has required fields",
      firstReview.id !== undefined &&
        firstReview.star_rating !== undefined &&
        firstReview.created_at !== undefined,
    );
  }
}
