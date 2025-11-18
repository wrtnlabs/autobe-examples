import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuRatingAggregate";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuRatingAggregate";

/**
 * Validate filtering of SKU rating aggregates by average rating range and
 * pagination consistency.
 *
 * Business context:
 *
 * - The endpoint PATCH /shoppingMall/ratingAggregates/skus searches a
 *   materialized view of precomputed rating aggregates per SKU.
 * - Each record exposes `average_rating`, `rating_count`, detailed bucket counts,
 *   and an associated `sku` summary.
 * - Clients typically want to filter SKUs by average rating bands (for example,
 *   3.0–4.5) and page through results.
 *
 * Test goals:
 *
 * 1. Confirm that providing `minAverageRating` and/or `maxAverageRating`
 *    constraints returns only records whose `average_rating` lies within the
 *    specified inclusive range, ignoring rows with `average_rating === null`.
 * 2. Confirm that pagination metadata in `pagination` is self-consistent with the
 *    `data.length` for the current page, especially for empty results.
 * 3. Exercise both a band that is reasonably likely to return some results and a
 *    band that results in an empty page, to verify both normal and empty
 *    states.
 *
 * Since this is a read-only analytic endpoint over a materialized view and we
 * do not have APIs for injecting deterministic review data, this test treats
 * the underlying data as opaque and focuses on contract-level invariants:
 *
 * - `average_rating` is either `null` (no reviews) or a number.
 * - When range filters are present, any non-null `average_rating` must satisfy
 *   the range.
 * - Empty `data` must be accompanied by `pagination.records === 0`.
 */
export async function test_api_sku_rating_aggregates_filter_by_rating_range(
  connection: api.IConnection,
) {
  // Helper to perform a search with given request body and assert the shape.
  const search = async (
    body: IShoppingMallSkuRatingAggregate.IRequest,
  ): Promise<IPageIShoppingMallSkuRatingAggregate.ISummary> => {
    const page: IPageIShoppingMallSkuRatingAggregate.ISummary =
      await api.functional.shoppingMall.ratingAggregates.skus.index(
        connection,
        {
          body,
        },
      );
    typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(page);
    return page;
  };

  // 1. Broad probe query to inspect current rating distribution and ensure
  //    endpoint is working with minimal constraints.
  const probeRequest = {
    // Let backend default page and size, but explicitly set sort to a stable
    // metric so that results are deterministic enough for assertions.
    sortBy: "averageRating",
    sortDirection: "desc",
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const probePage = await search(probeRequest);

  // Basic pagination invariants.
  const probePagination = probePage.pagination;
  TestValidator.predicate(
    "probe: records must be non-negative",
    probePagination.records >= 0,
  );
  TestValidator.predicate(
    "probe: pages must be non-negative",
    probePagination.pages >= 0,
  );
  TestValidator.predicate(
    "probe: limit must be non-negative",
    probePagination.limit >= 0,
  );
  TestValidator.predicate(
    "probe: current page must be non-negative",
    probePagination.current >= 0,
  );

  // If there are no records at all, we can still perform range tests in the
  // sense of verifying that empty responses are well-formed.

  // 2. Mid-range band test: [3.0, 4.5].
  const midMin = 3.0;
  const midMax = 4.5;

  const midRangeRequest = {
    sortBy: "averageRating",
    sortDirection: "desc",
    minAverageRating: midMin,
    maxAverageRating: midMax,
    page: 0,
    pageSize: 50,
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const midRangePage = await search(midRangeRequest);

  // All non-null average_rating values must fall within [midMin, midMax].
  for (const aggregate of midRangePage.data) {
    const rating = aggregate.average_rating;
    if (rating !== null && rating !== undefined) {
      TestValidator.predicate(
        "mid-range: rating must be >= minAverageRating",
        rating >= midMin,
      );
      TestValidator.predicate(
        "mid-range: rating must be <= maxAverageRating",
        rating <= midMax,
      );
    }
  }

  // Pagination consistency for mid-range band.
  const midPagination = midRangePage.pagination;
  TestValidator.predicate(
    "mid-range: records must be >= data.length",
    midPagination.records >= midRangePage.data.length,
  );
  TestValidator.predicate(
    "mid-range: pages must be >= 0",
    midPagination.pages >= 0,
  );

  if (midRangePage.data.length === 0) {
    TestValidator.equals(
      "mid-range: empty data implies zero records",
      midPagination.records,
      0,
    );
  }

  // 3. Narrow band expected to yield few or zero results. We cannot know the
  // actual distribution, but we can still assert that when the server returns
  // an empty page, pagination.records is zero and invariants hold.
  const narrowMin = 4.95;
  const narrowMax = 5.0;

  const narrowRangeRequest = {
    sortBy: "averageRating",
    sortDirection: "desc",
    minAverageRating: narrowMin,
    maxAverageRating: narrowMax,
    page: 0,
    pageSize: 20,
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const narrowRangePage = await search(narrowRangeRequest);

  for (const aggregate of narrowRangePage.data) {
    const rating = aggregate.average_rating;
    if (rating !== null && rating !== undefined) {
      TestValidator.predicate(
        "narrow-range: rating must be >= minAverageRating",
        rating >= narrowMin,
      );
      TestValidator.predicate(
        "narrow-range: rating must be <= maxAverageRating",
        rating <= narrowMax,
      );
    }
  }

  const narrowPagination = narrowRangePage.pagination;
  TestValidator.predicate(
    "narrow-range: records must be >= data.length",
    narrowPagination.records >= narrowRangePage.data.length,
  );

  if (narrowRangePage.data.length === 0) {
    TestValidator.equals(
      "narrow-range: empty data implies zero records",
      narrowPagination.records,
      0,
    );
  }
}
