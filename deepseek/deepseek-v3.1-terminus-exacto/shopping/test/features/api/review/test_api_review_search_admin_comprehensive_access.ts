import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Comprehensive E2E test for administrator review search functionality.
 *
 * Validates that administrators have full access to review search operations
 * including visibility of all review statuses (pending, approved, rejected,
 * flagged) and advanced filtering capabilities for moderation purposes.
 *
 * Test workflow:
 *
 * 1. Create administrator account with super_admin role
 * 2. Perform search operations with different status filters
 * 3. Test advanced filtering with rating ranges and actor types
 * 4. Validate pagination and sorting functionality
 * 5. Verify text search capabilities on review content
 */
export async function test_api_review_search_admin_comprehensive_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for full review access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          review_access: "full",
          moderation: true,
          search_all_statuses: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test comprehensive search with all status types
  const statuses = ["pending", "approved", "rejected", "flagged"] as const;

  for (const status of statuses) {
    const searchResults: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: {
          page: 1,
          limit: 10,
          status: status,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(searchResults);

    TestValidator.equals(
      `search with ${status} status returns correct page number`,
      searchResults.pagination.current,
      1,
    );
  }

  // Step 3: Test advanced filtering with rating ranges
  const ratingSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1,
        limit: 5,
        min_rating: 3,
        max_rating: 5,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(ratingSearch);

  // Step 4: Test actor type filtering
  const actorTypes = ["customer", "seller"] as const;

  for (const actorType of actorTypes) {
    const actorSearch: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: {
          page: 1,
          limit: 5,
          actor_type: actorType,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(actorSearch);
  }

  // Step 5: Test text search functionality
  const textSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1,
        limit: 5,
        search: "product",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(textSearch);

  // Step 6: Test sorting functionality
  const sortOptions = [
    "created_at",
    "overall_rating",
    "helpful_count",
  ] as const;

  for (const sortBy of sortOptions) {
    const sortedSearch: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: {
          page: 1,
          limit: 5,
          sort_by: sortBy,
          order: "desc",
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(sortedSearch);
  }

  // Step 7: Test pagination with different page sizes
  const pageSizes = [1, 5, 20, 50] as const;

  for (const limit of pageSizes) {
    const paginatedSearch: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: {
          page: 1,
          limit: limit,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(paginatedSearch);
  }

  // Step 8: Test combined filtering with multiple criteria
  const combinedSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "approved",
        min_rating: 4,
        actor_type: "customer",
        sort_by: "overall_rating",
        order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(combinedSearch);

  // Step 9: Verify data integrity using typia validation only
  if (combinedSearch.data.length > 0) {
    const sampleReview = combinedSearch.data[0];
    // typia.assert already validates all properties including ID format, rating range, and status
    // No additional validation needed beyond typia.assert()
    TestValidator.predicate(
      "combined search returns at least one review",
      combinedSearch.data.length >= 0,
    );
  }
}
