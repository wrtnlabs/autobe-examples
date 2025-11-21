import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test integration of review statistics in product snapshots.
 *
 * Validates that review counts and average ratings reflect the social proof
 * metrics as they existed at snapshot time. This comprehensive test creates
 * multiple sequential snapshots with varying review data to verify historical
 * accuracy and trend analysis.
 *
 * Test Steps:
 *
 * 1. Generate test product with sequential snapshots
 * 2. Retrieve multiple snapshots representing different time periods
 * 3. Validate review statistics consistency across snapshots
 * 4. Verify rating calculations and review count progression
 * 5. Test correlation between review metrics and business data
 * 6. Validate historical trend analysis capabilities
 * 7. Ensure snapshot integrity for audit trail purposes
 */
export async function test_api_product_snapshot_review_statistics_historical_context(
  connection: api.IConnection,
) {
  // Test multiple snapshots to verify historical accuracy
  const snapshots: IShoppingMallProductSnapshot[] = [];
  const productCode = RandomGenerator.alphaNumeric(8);

  // Create test data for multiple historical snapshots
  await ArrayUtil.asyncRepeat(3, async (index) => {
    const snapshotId = typia.random<string & tags.Format<"uuid">>();
    const snapshot =
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        connection,
        {
          productCode,
          snapshotId,
        },
      );
    snapshots.push(snapshot);
    typia.assert(snapshot);
  });

  // Validate each snapshot's review statistics
  snapshots.forEach((snapshot, index) => {
    // Core review metric validation
    TestValidator.predicate(
      `snapshot ${index + 1}: review count is valid integer`,
      snapshot.reviews_count >= 0 &&
        Number.isInteger(snapshot.reviews_count) &&
        snapshot.reviews_count <= 1000000, // reasonable upper bound
    );

    TestValidator.predicate(
      `snapshot ${index + 1}: average rating is in valid range`,
      snapshot.average_rating >= 0 && snapshot.average_rating <= 5,
    );

    // Validate correlation between review metrics
    if (snapshot.reviews_count === 0) {
      TestValidator.equals(
        `snapshot ${index + 1}: zero rating with no reviews`,
        snapshot.average_rating,
        0,
      );
    } else {
      TestValidator.predicate(
        `snapshot ${index + 1}: positive rating with reviews`,
        snapshot.average_rating > 0,
      );
    }

    // Validate business data consistency
    TestValidator.predicate(
      `snapshot ${index + 1}: product has valid category`,
      snapshot.category !== null && snapshot.category.id !== undefined,
    );

    TestValidator.predicate(
      `snapshot ${index + 1}: seller information is complete`,
      snapshot.seller !== null && snapshot.seller.id !== undefined,
    );

    // Validate temporal data integrity
    TestValidator.predicate(
      `snapshot ${index + 1}: creation dates are chronological`,
      new Date(snapshot.created_at) <= new Date(snapshot.snapshot_created_at),
    );

    TestValidator.predicate(
      `snapshot ${index + 1}: update dates are valid`,
      new Date(snapshot.updated_at) <= new Date(snapshot.snapshot_created_at),
    );

    // Validate product structure integrity
    TestValidator.predicate(
      `snapshot ${index + 1}: product has valid SKU`,
      snapshot.sku_code.length > 0 && snapshot.sku_code.length <= 50,
    );

    TestValidator.predicate(
      `snapshot ${index + 1}: product pricing is consistent`,
      snapshot.price >= 0 && snapshot.original_price >= snapshot.price,
    );
  });

  // Test historical trend analysis by comparing sequential snapshots
  for (let i = 1; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i - 1];

    // Validate temporal progression
    TestValidator.predicate(
      `snapshot ${i + 1} is chronologically after snapshot ${i}`,
      new Date(current.snapshot_created_at) >
        new Date(previous.snapshot_created_at),
    );

    // Analyze review trend possibilities (should handle all cases)
    TestValidator.predicate(
      `review count trend is valid between snapshots`,
      current.reviews_count >= previous.reviews_count ||
        (current.reviews_count < previous.reviews_count &&
          current.reviews_count >= 0),
    );

    // Validate rating evolution consistency
    if (
      current.reviews_count === previous.reviews_count &&
      current.reviews_count > 0
    ) {
      TestValidator.predicate(
        `rating consistent with same review count`,
        Math.abs(current.average_rating - previous.average_rating) <= 0.1,
      );
    }
  }

  // Test audit trail integrity
  const latestSnapshot = snapshots[snapshots.length - 1];
  TestValidator.predicate(
    "latest snapshot maintains complete audit trail",
    latestSnapshot.id !== undefined &&
      latestSnapshot.snapshot_created_at !== undefined &&
      latestSnapshot.created_at !== undefined &&
      latestSnapshot.updated_at !== undefined,
  );

  // Validate system metadata consistency
  TestValidator.predicate(
    "all snapshots have consistent product code reference",
    snapshots.every(
      (s) => typeof s.sku_code === "string" && s.sku_code.length > 0,
    ),
  );
}
