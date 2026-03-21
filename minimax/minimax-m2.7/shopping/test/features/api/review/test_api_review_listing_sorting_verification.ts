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

/**
 * Test the review listing endpoint with different sort options to verify sorting behavior.
 * Reviews can be sorted by newest, oldest, highest rating, or lowest rating.
 *
 * Test Steps:
 * 1. Query reviews with sortBy: "newest" - verify created_at DESC
 * 2. Query reviews with sortBy: "oldest" - verify created_at ASC
 * 3. Query reviews with sortBy: "rating_high" - verify rating DESC
 * 4. Query reviews with sortBy: "rating_low" - verify rating ASC
 * 5. Query reviews without sortBy parameter - verify default behavior (newest)
 *
 * Validation Points:
 * - Each sort option produces correctly ordered results
 * - Default sort (newest) applied when sortBy omitted
 * - Ratings in rating_high sorted highest to lowest (5 to 1)
 * - Ratings in rating_low sorted lowest to highest (1 to 5)
 * - Dates in newest sorted most recent first
 * - Dates in oldest sorted oldest first
 */
export async function test_api_review_listing_sorting_verification(
  connection: api.IConnection,
): Promise<void> {
  // Test sortBy: "newest" - should sort by created_at DESC
  const newestResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        sortBy: "newest",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(newestResult);
  // Validate newest sort order (created_at DESC)
  if (newestResult.data.length > 1) {
    for (let i = 0; i < newestResult.data.length - 1; i++) {
      const current = new Date(newestResult.data[i].created_at).getTime();
      const next = new Date(newestResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "newest sort: current review should be newer or equal",
        current >= next,
      );
    }
  }
  // Test sortBy: "oldest" - should sort by created_at ASC
  const oldestResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        sortBy: "oldest",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(oldestResult);
  // Validate oldest sort order (created_at ASC)
  if (oldestResult.data.length > 1) {
    for (let i = 0; i < oldestResult.data.length - 1; i++) {
      const current = new Date(oldestResult.data[i].created_at).getTime();
      const next = new Date(oldestResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "oldest sort: current review should be older or equal",
        current <= next,
      );
    }
  }
  // Test sortBy: "rating_high" - should sort by rating DESC
  const ratingHighResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        sortBy: "rating_high",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(ratingHighResult);
  // Validate rating_high sort order (rating DESC, 5 to 1)
  if (ratingHighResult.data.length > 1) {
    for (let i = 0; i < ratingHighResult.data.length - 1; i++) {
      TestValidator.predicate(
        "rating_high sort: current rating should be >= next rating",
        ratingHighResult.data[i].rating >= ratingHighResult.data[i + 1].rating,
      );
    }
  }
  // Test sortBy: "rating_low" - should sort by rating ASC
  const ratingLowResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        sortBy: "rating_low",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(ratingLowResult);
  // Validate rating_low sort order (rating ASC, 1 to 5)
  if (ratingLowResult.data.length > 1) {
    for (let i = 0; i < ratingLowResult.data.length - 1; i++) {
      TestValidator.predicate(
        "rating_low sort: current rating should be <= next rating",
        ratingLowResult.data[i].rating <= ratingLowResult.data[i + 1].rating,
      );
    }
  }
  // Test without sortBy parameter - should default to newest (created_at DESC)
  const defaultResult = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {} satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(defaultResult);
  // Validate default sort matches newest
  if (defaultResult.data.length > 1) {
    for (let i = 0; i < defaultResult.data.length - 1; i++) {
      const current = new Date(defaultResult.data[i].created_at).getTime();
      const next = new Date(defaultResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "default sort: should match newest sort order",
        current >= next,
      );
    }
  }
}
