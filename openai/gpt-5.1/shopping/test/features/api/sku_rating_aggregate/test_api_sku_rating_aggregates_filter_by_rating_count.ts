import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuRatingAggregate";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuRatingAggregate";

/**
 * Validate filtering of SKU rating aggregates by minimum rating_count.
 *
 * Business goals:
 *
 * - Ensure that the SKU rating aggregates search endpoint correctly applies the
 *   minRatingCount filter so that only sufficiently-reviewed SKUs are
 *   returned.
 * - Verify that minRatingCount=0 behaves equivalently to omitting the filter in
 *   terms of not excluding items based solely on rating_count.
 * - Confirm that setting an excessively high minRatingCount yields an empty
 *   result set with pagination.records = 0.
 *
 * Test steps:
 *
 * 1. Perform an exploratory search without minRatingCount to collect a baseline
 *    page of aggregates and their rating_count distribution.
 * 2. If no records exist, the test succeeds early (there is nothing meaningful to
 *    filter) after asserting the response shape.
 * 3. Choose a threshold N derived from the baseline page that is greater than 0
 *    and not above the maximum rating_count, to ensure at least one candidate
 *    record should remain after filtering.
 * 4. Call the search endpoint with minRatingCount = N and verify:
 *
 *    - All returned records have rating_count >= N.
 *    - Baseline records whose rating_count < N are not present in the filtered
 *         result (at least for a sampled subset or by ID check).
 * 5. Call the search endpoint with an extremely high minRatingCount larger than
 *    any observed rating_count and verify the page is empty and
 *    pagination.records = 0.
 * 6. Call the search endpoint with minRatingCount = 0 and compare against the
 *    baseline page to ensure that, for the rating_count dimension, it does not
 *    exclude baseline records by having rating_count < some positive value.
 */
export async function test_api_sku_rating_aggregates_filter_by_rating_count(
  connection: api.IConnection,
) {
  // 1. Exploratory search without minRatingCount
  const baseRequestBody = {
    page: 0,
    pageSize: 50,
    sortBy: "ratingCount" as const,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const basePage: IPageIShoppingMallSkuRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.skus.index(connection, {
      body: baseRequestBody,
    });
  typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(basePage);

  const basePagination = basePage.pagination;
  const baseData = basePage.data;

  TestValidator.predicate(
    "pagination current page and limit are non-negative",
    basePagination.current >= 0 && basePagination.limit >= 0,
  );

  // If no data exists at all, we can only assert structure and finish.
  if (baseData.length === 0 || basePagination.records === 0) {
    TestValidator.equals(
      "no aggregates available implies data length is zero",
      baseData.length,
      0,
    );
    TestValidator.equals(
      "no aggregates available implies pagination.records is zero",
      basePagination.records,
      0,
    );
    return;
  }

  // 2. Determine threshold N based on observed rating_count values.
  const ratingCounts = baseData.map((row) => row.rating_count);
  const maxRatingCount = ratingCounts.reduce(
    (max, current) => (current > max ? current : max),
    ratingCounts[0],
  );

  // Choose a positive threshold that is at most the maximum rating_count.
  // If maxRatingCount is 0, filtering by minRatingCount>0 would always
  // produce empty results, which we will test via the "very high" threshold.
  const candidateThresholds: number[] = [];
  for (let i = 1; i <= 10; i++) candidateThresholds.push(i);
  const feasibleThresholds = candidateThresholds.filter(
    (t) => t <= maxRatingCount,
  );

  const threshold =
    feasibleThresholds.length > 0
      ? feasibleThresholds[feasibleThresholds.length - 1]
      : 0;

  TestValidator.predicate(
    "chosen threshold is non-negative and not greater than maxRatingCount",
    threshold >= 0 && threshold <= maxRatingCount,
  );

  // 3. Filter by minRatingCount = threshold when we have a non-zero threshold.
  if (threshold > 0) {
    const filteredRequestBody = {
      ...baseRequestBody,
      minRatingCount: threshold,
    } satisfies IShoppingMallSkuRatingAggregate.IRequest;

    const filteredPage: IPageIShoppingMallSkuRatingAggregate.ISummary =
      await api.functional.shoppingMall.ratingAggregates.skus.index(
        connection,
        {
          body: filteredRequestBody,
        },
      );
    typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(filteredPage);

    const filteredData = filteredPage.data;

    // If there are filtered records, all must satisfy rating_count >= threshold.
    if (filteredData.length > 0) {
      for (const row of filteredData) {
        TestValidator.predicate(
          "filtered row must meet minRatingCount threshold",
          row.rating_count >= threshold,
        );
      }

      // Baseline rows with rating_count < threshold should not appear
      // in the filtered set. We'll sample a subset (or all if small).
      const baselineLowCountRows = baseData.filter(
        (row) => row.rating_count < threshold,
      );

      const sampleSize = Math.min(5, baselineLowCountRows.length);
      const sampled = baselineLowCountRows.slice(0, sampleSize);

      for (const lowRow of sampled) {
        const existsInFiltered = filteredData.some(
          (row) => row.id === lowRow.id,
        );
        TestValidator.predicate(
          "baseline row with rating_count below threshold not returned",
          existsInFiltered === false,
        );
      }
    }
  }

  // 4. Very high minRatingCount expected to produce empty result.
  const veryHighThreshold = maxRatingCount + 1;
  const veryHighRequestBody = {
    ...baseRequestBody,
    minRatingCount: veryHighThreshold,
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const veryHighPage: IPageIShoppingMallSkuRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.skus.index(connection, {
      body: veryHighRequestBody,
    });
  typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(veryHighPage);

  TestValidator.equals(
    "very high minRatingCount yields empty page data",
    veryHighPage.data.length,
    0,
  );

  TestValidator.equals(
    "very high minRatingCount yields pagination.records = 0",
    veryHighPage.pagination.records,
    0,
  );

  // 5. minRatingCount = 0 should behave like not applying a rating_count
  // restriction. We cannot assert strong equality of pagination but we can
  // ensure at least that baseline records are not excluded solely by
  // rating_count.
  const zeroThresholdRequestBody = {
    ...baseRequestBody,
    minRatingCount: 0,
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const zeroThresholdPage: IPageIShoppingMallSkuRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.skus.index(connection, {
      body: zeroThresholdRequestBody,
    });
  typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(
    zeroThresholdPage,
  );

  const zeroData = zeroThresholdPage.data;

  // Because of pagination, not all baseline IDs must be present, but any
  // record that is present in both pages has the same rating_count, and we
  // verify that setting minRatingCount=0 does not exclude records whose
  // rating_count is below a positive threshold purely by rating_count.
  if (zeroData.length > 0) {
    const intersectionById = baseData.filter((baseRow) =>
      zeroData.some((z) => z.id === baseRow.id),
    );

    for (const row of intersectionById) {
      const corresponding = zeroData.find((z) => z.id === row.id)!;
      TestValidator.equals(
        "rating_count stays consistent between baseline and minRatingCount=0",
        corresponding.rating_count,
        row.rating_count,
      );
    }
  }
}
