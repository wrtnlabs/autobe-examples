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
 * Test admin capabilities to investigate buyer review history during customer
 * support scenarios.
 *
 * This test simulates support workflows where admins need to review a buyer's
 * feedback history to understand disputes, investigate fraud claims, or assess
 * buyer credibility. The test validates that admins can use all available
 * filters (product, rating, dates, verification status) to conduct thorough
 * investigations, supporting evidence-based dispute resolution and platform
 * integrity maintenance.
 *
 * Workflow:
 *
 * 1. Create admin account for customer support investigation
 * 2. Test basic buyer review retrieval with pagination
 * 3. Test filtering by product (sale_id)
 * 4. Test filtering by rating range (min_rating/max_rating)
 * 5. Test filtering by verification status (verified_purchase_only)
 * 6. Test filtering by date range (start_date/end_date)
 * 7. Test combined filters for comprehensive investigation
 * 8. Validate all responses return proper pagination structure
 */
export async function test_api_admin_buyer_reviews_support_investigation(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for customer support investigation
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "support",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Generate random buyer ID for testing
  const buyerId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test basic buyer review retrieval with pagination
  const basicReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(basicReviews);
  TestValidator.predicate(
    "basic reviews response has pagination",
    basicReviews.pagination !== undefined,
  );
  TestValidator.predicate(
    "basic reviews response has data array",
    Array.isArray(basicReviews.data),
  );

  // Step 3: Test filtering by product (sale_id)
  const productFilterReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 10,
        sale_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(productFilterReviews);
  TestValidator.predicate(
    "product filter reviews response valid",
    productFilterReviews.pagination !== undefined,
  );

  // Step 4: Test filtering by rating range (min_rating/max_rating)
  const ratingFilterReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 15,
        min_rating: 3,
        max_rating: 5,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(ratingFilterReviews);
  TestValidator.predicate(
    "rating filter reviews response valid",
    ratingFilterReviews.pagination !== undefined,
  );

  // Step 5: Test filtering by verification status (verified_purchase_only)
  const verifiedReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 20,
        verified_purchase_only: true,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(verifiedReviews);
  TestValidator.predicate(
    "verified reviews response valid",
    verifiedReviews.pagination !== undefined,
  );

  // Step 6: Test filtering by date range (start_date/end_date)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 20,
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(dateFilterReviews);
  TestValidator.predicate(
    "date filter reviews response valid",
    dateFilterReviews.pagination !== undefined,
  );

  // Step 7: Test combined filters for comprehensive investigation
  const comprehensiveReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 10,
        min_rating: 1,
        max_rating: 2,
        verified_purchase_only: true,
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(comprehensiveReviews);
  TestValidator.predicate(
    "comprehensive filter reviews response valid",
    comprehensiveReviews.pagination !== undefined,
  );

  // Step 8: Test with status filter for moderation workflow
  const moderationReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 50,
        status: "pending_moderation",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(moderationReviews);
  TestValidator.predicate(
    "moderation reviews response valid",
    moderationReviews.pagination !== undefined,
  );

  // Step 9: Test with text search for investigation
  const searchReviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 1,
        limit: 20,
        search_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(searchReviews);
  TestValidator.predicate(
    "search reviews response valid",
    searchReviews.pagination !== undefined,
  );

  // Step 10: Test pagination across multiple pages
  const page2Reviews =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(page2Reviews);
  TestValidator.equals(
    "page 2 current page",
    page2Reviews.pagination.current,
    2,
  );
}
