import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuRatingAggregate";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuRatingAggregate";

/**
 * Validate SKU rating aggregate search filtering by skuIds and empty filters.
 *
 * Business goal
 *
 * - Ensure that the SKU rating aggregate search endpoint correctly restricts
 *   results when skuIds are provided, and that basic pagination metadata is
 *   coherent.
 * - Because only the read-only aggregate search API is provided, the test must
 *   work against whatever fixture data exists, without assuming specific SKUs
 *   or product relationships.
 *
 * Steps
 *
 * 1. Perform a broad search without filters to obtain a baseline page of
 *    aggregates.
 *
 *    - Call PATCH /shoppingMall/ratingAggregates/skus with a minimal body (no
 *         filters, default pagination).
 *    - Assert the response type with typia.assert.
 *    - If there is at least one aggregate row, continue with skuId filtering tests;
 *         otherwise, fall back to an empty-filter behavior check.
 * 2. When baseline has data, derive a subset of skuIds and verify filtering.
 *
 *    - Collect skuIds from each row.sku.id.
 *    - Select 1–3 ids from this collection (or the maximum available if fewer
 *         exist).
 *    - Call the endpoint again with body.skuIds set to the selected subset, leaving
 *         other filters (including productIds) undefined.
 *    - Assert the response type.
 *    - For every returned row, assert that row.sku.id is in the requested skuIds
 *         subset using TestValidator.predicate.
 *    - Assert that pagination.limit and pagination.records are not smaller than
 *         data.length, i.e., the metadata is self-consistent for the current
 *         page.
 *    - When the selected subset contains exactly one skuId, assert that all rows
 *         share that single skuId, strengthening the filter correctness check.
 * 3. Test behavior when skuIds is an empty array.
 *
 *    - Call the endpoint with body.skuIds: [] and otherwise the same minimal
 *         pagination settings.
 *    - There are two acceptable behaviors: a) The backend treats skuIds: [] as a
 *         valid filter (equivalent to no skuId filter) and returns a normal
 *         page response.
 *
 *         - In this case, just assert the response type. b) The backend rejects skuIds:
 *                   [] as invalid input and throws an error.
 *         - In this case, wrap the call in TestValidator.error and only assert that an
 *                   error occurs, without checking status codes or messages.
 *    - Implement this by first attempting a direct call inside a try/catch. If it
 *         fails, re-run the same call inside TestValidator.error to document
 *         error behavior.
 * 4. When baseline has no data.
 *
 *    - If the initial broad search returns an empty data array, we cannot
 *         meaningfully test inclusion filtering, but we still:
 *
 *         - Assert the baseline response type and that pagination.records is 0 and
 *                   data.length is 0.
 *         - Execute the skuIds: [] test (step 3) to cover empty-filter behavior.
 *
 * Notes and constraints
 *
 * - We do not test productIds filtering because no product identifier is exposed
 *   in IShoppingMallSku.ISummary or any other provided DTO, and no catalog
 *   endpoint is available to derive it safely.
 * - We avoid any type-error or missing-field tests; all request bodies must
 *   satisfy IShoppingMallSkuRatingAggregate.IRequest.
 * - All API calls are awaited, all TestValidator calls include descriptive
 *   titles, and only the imports provided in the template are used.
 */
export async function test_api_sku_rating_aggregates_filter_by_sku_and_product_ids(
  connection: api.IConnection,
) {
  // 1. Broad baseline search with minimal request body (no filters).
  const baselineRequestBody = {
    // Let the backend apply defaults by omitting page/pageSize when possible.
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const baselinePage: IPageIShoppingMallSkuRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.skus.index(connection, {
      body: baselineRequestBody,
    });
  typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(baselinePage);

  const baselineData = baselinePage.data;

  // If there is no data at all, we can only validate basic pagination and the
  // behavior of skuIds: [] (step 4).
  if (baselineData.length === 0) {
    TestValidator.equals(
      "baseline has no records: pagination.records should be 0",
      baselinePage.pagination.records,
      0,
    );
    TestValidator.equals(
      "baseline has no records: data.length should be 0",
      baselineData.length,
      0,
    );

    // Execute the skuIds: [] behavior test via TestValidator.error wrapper.
    const emptyIdsRequestBody = {
      skuIds: [],
    } satisfies IShoppingMallSkuRatingAggregate.IRequest;

    await TestValidator.error(
      "skuIds empty array may be rejected when no baseline data exists",
      async () => {
        await api.functional.shoppingMall.ratingAggregates.skus.index(
          connection,
          {
            body: emptyIdsRequestBody,
          },
        );
      },
    );

    return;
  }

  // 2. Derive a subset of skuIds from baseline data.
  const allSkuIds: string[] = baselineData.map((row) => row.sku.id);
  const uniqueSkuIds: string[] = Array.from(new Set(allSkuIds));

  // Choose up to 3 unique skuIds, but at least 1.
  const subsetSize: number = uniqueSkuIds.length >= 3 ? 3 : uniqueSkuIds.length;
  const selectedSkuIds: string[] =
    subsetSize === uniqueSkuIds.length
      ? uniqueSkuIds
      : ArrayUtil.repeat(subsetSize, (index) => uniqueSkuIds[index]);

  // 3. Call the endpoint with skuIds filter.
  const filteredRequestBody = {
    skuIds: selectedSkuIds,
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const filteredPage: IPageIShoppingMallSkuRatingAggregate.ISummary =
    await api.functional.shoppingMall.ratingAggregates.skus.index(connection, {
      body: filteredRequestBody,
    });
  typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(filteredPage);

  const filteredData = filteredPage.data;

  // Assert that every returned row.sku.id is within the requested skuIds.
  for (const row of filteredData) {
    TestValidator.predicate(
      "each filtered row must have sku.id within requested skuIds",
      selectedSkuIds.includes(row.sku.id),
    );
  }

  // Assert pagination metadata is coherent with the data length.
  TestValidator.predicate(
    "pagination.limit must be >= data.length",
    filteredPage.pagination.limit >= filteredData.length,
  );
  TestValidator.predicate(
    "pagination.records must be >= data.length",
    filteredPage.pagination.records >= filteredData.length,
  );

  // If only a single skuId was selected, all rows should have that skuId.
  if (selectedSkuIds.length === 1) {
    const singleSkuId = selectedSkuIds[0];
    for (const row of filteredData) {
      TestValidator.equals(
        "all rows must share the single requested skuId",
        singleSkuId,
        row.sku.id,
      );
    }
  }

  // 4. Test behavior when skuIds is an empty array.
  const emptyIdsBody = {
    skuIds: [],
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  let emptyFilterSucceeded = false;
  try {
    const emptyPage: IPageIShoppingMallSkuRatingAggregate.ISummary =
      await api.functional.shoppingMall.ratingAggregates.skus.index(
        connection,
        {
          body: emptyIdsBody,
        },
      );
    typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(emptyPage);
    emptyFilterSucceeded = true;
  } catch {
    emptyFilterSucceeded = false;
  }

  if (!emptyFilterSucceeded) {
    await TestValidator.error(
      "skuIds empty array may be rejected as invalid filter",
      async () => {
        await api.functional.shoppingMall.ratingAggregates.skus.index(
          connection,
          {
            body: emptyIdsBody,
          },
        );
      },
    );
  }
}
