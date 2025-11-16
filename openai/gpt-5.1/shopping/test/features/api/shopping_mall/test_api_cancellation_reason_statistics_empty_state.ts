import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallOrderCancellationReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationReasonStatistics";

/**
 * Validate empty-state behavior of cancellation reason statistics endpoint.
 *
 * Business goal:
 *
 * - Ensure analytics consumers and dashboards can safely call GET
 *   /shoppingMall/statistics/cancellationReasons when there are no cancellation
 *   requests in scope, and still receive a valid
 *   IShoppingMallOrderCancellationReasonStatistics payload instead of an
 *   error.
 *
 * What this test verifies:
 *
 * 1. The endpoint can be called without authentication.
 * 2. The response is structurally valid
 *    (typia.assert<IShoppingMallOrderCancellationReasonStatistics>).
 * 3. When total_cancellation_request_count is 0, all nested request_count fields
 *    across reason_categories and actor_segments, if present, are also 0 so
 *    there is no contradictory aggregate data in an empty-state scenario.
 * 4. When total_cancellation_request_count is greater than 0, the object is still
 *    type-correct and the sum of nested request_count values across top-level
 *    buckets is at least total_cancellation_request_count (a best-effort
 *    consistency sanity check without assuming exact aggregation rules).
 */
export async function test_api_cancellation_reason_statistics_empty_state(
  connection: api.IConnection,
) {
  // 1. Call the statistics endpoint without any authentication
  const output: IShoppingMallOrderCancellationReasonStatistics =
    await api.functional.shoppingMall.statistics.cancellationReasons.index(
      connection,
    );

  // 2. Structural type validation: ensures format, required fields and
  //    nested structures all conform to IShoppingMallOrderCancellationReasonStatistics
  typia.assert<IShoppingMallOrderCancellationReasonStatistics>(output);

  // 3. Basic invariants that must always hold
  TestValidator.predicate(
    "total_cancellation_request_count is non-negative",
    output.total_cancellation_request_count >= 0,
  );

  // 4. If total is 0, all nested request_count values must also be 0
  if (output.total_cancellation_request_count === 0) {
    // 4-1. reason_categories should not contain any positive counts
    for (const category of output.reason_categories) {
      TestValidator.predicate(
        `reason category '${category.request_reason_category}' has 0 total when global total is 0`,
        category.request_count === 0,
      );

      for (const actorTypeCount of category.actor_type_counts) {
        TestValidator.predicate(
          `actor_type '${actorTypeCount.actor_type}' count is 0 when global total is 0`,
          actorTypeCount.request_count === 0,
        );
      }

      for (const resolutionCount of category.resolution_counts) {
        TestValidator.predicate(
          `resolution '${resolutionCount.resolution_category}' count is 0 when global total is 0`,
          resolutionCount.request_count === 0,
        );
      }
    }

    // 4-2. actor_segments should not contain any positive counts
    for (const segment of output.actor_segments) {
      TestValidator.predicate(
        `actor segment '${segment.actor_type}' total is 0 when global total is 0`,
        segment.request_count === 0,
      );

      for (const reasonCount of segment.reason_category_counts) {
        TestValidator.predicate(
          `actor segment '${segment.actor_type}' reason '${reasonCount.request_reason_category}' count is 0 when global total is 0`,
          reasonCount.request_count === 0,
        );
      }

      for (const resolutionCount of segment.resolution_counts) {
        TestValidator.predicate(
          `actor segment '${segment.actor_type}' resolution '${resolutionCount.resolution_category}' count is 0 when global total is 0`,
          resolutionCount.request_count === 0,
        );
      }
    }
  } else {
    // 5. When total is positive, perform a sanity check that nested
    //    aggregates are at least consistent in terms of scale.
    const sumReasonCategoryRequests = output.reason_categories.reduce(
      (acc, category) => acc + category.request_count,
      0,
    );

    const sumActorSegmentRequests = output.actor_segments.reduce(
      (acc, segment) => acc + segment.request_count,
      0,
    );

    TestValidator.predicate(
      "sum of reason category request_count is at least total_cancellation_request_count",
      sumReasonCategoryRequests >= output.total_cancellation_request_count,
    );

    TestValidator.predicate(
      "sum of actor segment request_count is at least total_cancellation_request_count",
      sumActorSegmentRequests >= output.total_cancellation_request_count,
    );
  }
}
