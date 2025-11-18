import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuRatingAggregate";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuRatingAggregate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuRatingAggregate";

/**
 * Basic search for SKU rating aggregates with default pagination and structural
 * validation.
 *
 * This E2E test exercises the `PATCH /shoppingMall/ratingAggregates/skus`
 * endpoint via `api.functional.shoppingMall.ratingAggregates.skus.index` using
 * a minimal request body. It validates that the server returns a well-formed
 * paginated result of SKU rating aggregates and that core business invariants
 * hold for both pagination metadata and individual aggregate rows.
 *
 * Test steps:
 *
 * 1. Call the SKU rating aggregate index endpoint with an empty IRequest body,
 *    letting the backend apply default pagination and filter values.
 * 2. Assert the response matches `IPageIShoppingMallSkuRatingAggregate.ISummary`
 *    using `typia.assert`, ensuring that both the `pagination` block and `data`
 *    array are structurally correct, including nested DTOs.
 * 3. Validate pagination invariants using `TestValidator.predicate`:
 *
 *    - `current >= 0`
 *    - `limit >= 0`
 *    - `records >= 0`
 *    - `pages >= 0`
 * 4. If the `data` array is non-empty, iterate over each
 *    `IShoppingMallSkuRatingAggregate.ISummary` item and enforce:
 *
 *    - `rating_count`, `rating_1_count`..`rating_5_count` are all `>= 0`.
 *    - `last_computed_at` is present (format already validated by typia).
 *    - When `average_rating` is not `null`/`undefined`, it lies within `[0, 5]` and
 *         `rating_count > 0`.
 *    - The nested `sku` summary has:
 *
 *         - Non-empty `id` (UUID enforced by typia type tags),
 *         - Non-empty `code`,
 *         - Non-empty `name`.
 *
 * This test does not attempt to control or seed underlying review data; it
 * assumes some aggregates may or may not exist, and branches logic
 * accordingly.
 */
export async function test_api_sku_rating_aggregates_basic_search(
  connection: api.IConnection,
) {
  // 1. Perform basic search with minimal body (backend defaults pagination)
  const requestBody = {
    // Intentionally empty to exercise default pagination behavior
  } satisfies IShoppingMallSkuRatingAggregate.IRequest;

  const page = await api.functional.shoppingMall.ratingAggregates.skus.index(
    connection,
    {
      body: requestBody,
    },
  );

  // 2. Structural validation of the page response
  typia.assert<IPageIShoppingMallSkuRatingAggregate.ISummary>(page);

  const { pagination, data } = page;

  // 3. Basic pagination invariants
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // 4. When there are aggregates, validate each record
  if (data.length > 0) {
    for (const aggregate of data) {
      // Re-assert structure at item level for explicitness
      typia.assert<IShoppingMallSkuRatingAggregate.ISummary>(aggregate);

      const {
        average_rating,
        rating_count,
        rating_1_count,
        rating_2_count,
        rating_3_count,
        rating_4_count,
        rating_5_count,
        last_computed_at,
        sku,
      } = aggregate;

      // Rating count invariants (business-level but aligned with tags.Minimum<0>)
      TestValidator.predicate(
        "rating_count is non-negative",
        rating_count >= 0,
      );
      TestValidator.predicate(
        "rating_1_count is non-negative",
        rating_1_count >= 0,
      );
      TestValidator.predicate(
        "rating_2_count is non-negative",
        rating_2_count >= 0,
      );
      TestValidator.predicate(
        "rating_3_count is non-negative",
        rating_3_count >= 0,
      );
      TestValidator.predicate(
        "rating_4_count is non-negative",
        rating_4_count >= 0,
      );
      TestValidator.predicate(
        "rating_5_count is non-negative",
        rating_5_count >= 0,
      );

      // Average rating semantics: when present, must be within [0, 5] and rating_count > 0
      if (average_rating !== null && average_rating !== undefined) {
        TestValidator.predicate(
          "average_rating is between 0 and 5 when present",
          average_rating >= 0 && average_rating <= 5,
        );
        TestValidator.predicate(
          "rating_count is positive when average_rating is present",
          rating_count > 0,
        );
      }

      // last_computed_at should be a non-empty string (ISO validation by typia)
      TestValidator.predicate(
        "last_computed_at is non-empty",
        typeof last_computed_at === "string" && last_computed_at.length > 0,
      );

      // SKU summary invariants: id, code, name must be non-empty strings
      TestValidator.predicate(
        "sku.id is non-empty",
        typeof sku.id === "string" && sku.id.length > 0,
      );
      TestValidator.predicate(
        "sku.code is non-empty",
        typeof sku.code === "string" && sku.code.length > 0,
      );
      TestValidator.predicate(
        "sku.name is non-empty",
        typeof sku.name === "string" && sku.name.length > 0,
      );
    }
  }
}
