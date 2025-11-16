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
 * Test that administrators can filter buyer reviews by image presence.
 *
 * This test validates the admin's ability to filter reviews based on whether
 * they contain customer-uploaded images using the has_images parameter. This
 * functionality supports content moderation workflows, quality assessment, and
 * marketplace analytics by allowing admins to identify visually-enriched
 * reviews or analyze image upload patterns.
 *
 * Test Flow:
 *
 * 1. Create and authenticate admin account
 * 2. Filter reviews with images (has_images: true)
 * 3. Filter reviews without images (has_images: false)
 * 4. Validate response structure and pagination metadata
 * 5. Verify type safety of all returned data
 */
export async function test_api_admin_buyer_reviews_image_presence_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminCreateBody = {
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

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Generate random buyer ID for filtering
  const buyerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test filtering reviews WITH images (has_images: true)
  const requestWithImages = {
    page: 1,
    limit: 20,
    has_images: true,
  } satisfies IShoppingMallReview.IRequest;

  const reviewsWithImages: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: requestWithImages,
    });
  typia.assert(reviewsWithImages);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists for reviews with images",
    reviewsWithImages.pagination !== null &&
      reviewsWithImages.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists for reviews with images",
    Array.isArray(reviewsWithImages.data),
  );

  // Step 4: Test filtering reviews WITHOUT images (has_images: false)
  const requestWithoutImages = {
    page: 1,
    limit: 20,
    has_images: false,
  } satisfies IShoppingMallReview.IRequest;

  const reviewsWithoutImages: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: requestWithoutImages,
    });
  typia.assert(reviewsWithoutImages);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists for reviews without images",
    reviewsWithoutImages.pagination !== null &&
      reviewsWithoutImages.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists for reviews without images",
    Array.isArray(reviewsWithoutImages.data),
  );

  // Step 5: Test default behavior (has_images not specified)
  const requestDefault = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;

  const reviewsDefault: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: requestDefault,
    });
  typia.assert(reviewsDefault);

  TestValidator.predicate(
    "pagination object exists for default filter",
    reviewsDefault.pagination !== null &&
      reviewsDefault.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists for default filter",
    Array.isArray(reviewsDefault.data),
  );
}
