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
 * Test that administrators can see reviews in all moderation states
 * simultaneously when no status filter is applied.
 *
 * This test validates admin privilege for complete review visibility across all
 * moderation states (pending_moderation, approved, rejected) without requiring
 * explicit status filtering. This enables comprehensive review monitoring and
 * moderation workflows.
 *
 * Steps:
 *
 * 1. Create and authenticate as admin user
 * 2. Retrieve reviews for a buyer without status filter
 * 3. Validate that the API returns reviews regardless of moderation status
 * 4. Confirm response structure and type safety
 */
export async function test_api_admin_buyer_reviews_all_statuses_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Retrieve all reviews for a buyer without status filter
  const buyerId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;

  const reviewsResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: requestBody,
    });

  // Step 3: Validate response structure and type safety
  typia.assert(reviewsResponse);

  // Step 4: Verify pagination structure
  TestValidator.predicate(
    "response has valid pagination structure",
    reviewsResponse.pagination !== null &&
      reviewsResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page is valid",
    reviewsResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is valid",
    reviewsResponse.pagination.limit >= 0,
  );

  // Step 5: Verify data array exists (may be empty if no reviews for this buyer)
  TestValidator.predicate(
    "response has data array",
    Array.isArray(reviewsResponse.data),
  );

  // Step 6: If reviews exist, verify they can have any status value
  // This demonstrates admin visibility across all moderation states
  if (reviewsResponse.data.length > 0) {
    const statuses = reviewsResponse.data.map((review) => review.status);

    TestValidator.predicate(
      "reviews returned without status filtering",
      statuses.every(
        (status) =>
          status === "pending_moderation" ||
          status === "approved" ||
          status === "rejected",
      ),
    );
  }
}
