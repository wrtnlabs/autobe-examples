import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest browsing reviews when the dataset is empty.
 *
 * Validates that the review browsing endpoint correctly handles empty result sets in two scenarios: filtering by a product with no reviews and querying with no filters when no data exists. Ensures the response structure remains complete with proper pagination metadata showing zero records and pages.
 *
 * Confirms that the API does not throw errors for legitimately empty data and returns valid paginated responses with empty data arrays and zero pagination counts.
 *
 * 1. Guest authenticates via device fingerprint.
 * 2. Guest browses reviews filtered by product ID (product has no reviews) - validates empty data array and pagination with records=0, pages=0.
 * 3. Guest browses reviews with no filters (completely empty dataset) - validates empty result set with proper pagination metadata.
 */
export async function test_api_review_guest_browsing_empty_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {});
  typia.assert(guest);
  // 2. Browse reviews with productId filter (product with no reviews)
  // Use a non-existent product UUID to guarantee zero reviews
  const fakeProductId = typia.random<string & tags.Format<"uuid">>();
  const bodyWithProductFilter = {
    productId: fakeProductId,
  } satisfies IEcommercePlatformReview.IRequest;
  const reviewsFiltered =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: bodyWithProductFilter,
      },
    );
  typia.assert(reviewsFiltered);
  // Validate empty result with product filter
  TestValidator.equals(
    "data array is empty with product filter",
    reviewsFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "records count is 0 with product filter",
    reviewsFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 with product filter",
    reviewsFiltered.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page is valid",
    reviewsFiltered.pagination.current >= 1,
  );
  // 3. Browse reviews with no filters (completely empty dataset scenario)
  const bodyNoFilters = {} satisfies IEcommercePlatformReview.IRequest;
  const reviewsEmpty =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: bodyNoFilters,
      },
    );
  typia.assert(reviewsEmpty);
  // Validate empty result with no filters
  TestValidator.equals(
    "data array is empty without filters",
    reviewsEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "records count is 0 without filters",
    reviewsEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 without filters",
    reviewsEmpty.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page is valid without filters",
    reviewsEmpty.pagination.current >= 1,
  );
}
