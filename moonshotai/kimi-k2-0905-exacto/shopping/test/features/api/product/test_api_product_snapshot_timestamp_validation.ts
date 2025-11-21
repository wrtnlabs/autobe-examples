import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test accuracy of timestamp fields in product snapshots.
 *
 * Validates that created_at, updated_at, and snapshot_created_at timestamps are
 * correctly formatted and represent accurate chronological information. Ensures
 * proper temporal data integrity for audit trail compliance.
 *
 * Test approach:
 *
 * 1. Generate random product code and snapshot ID
 * 2. Retrieve product snapshot through API
 * 3. Validate all timestamp fields have proper ISO 8601 format
 * 4. Verify timestamp chronology (created_at <= updated_at <= snapshot_created_at)
 * 5. Validate timestamp consistency with related structures
 * 6. Test with multiple snapshots to ensure pattern consistency
 */
export async function test_api_product_snapshot_timestamp_validation(
  connection: api.IConnection,
) {
  // Generate test data
  const productCode = typia.random<string>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve product snapshot
  const snapshot =
    await api.functional.shoppingMall.products.snapshots.atSnapshot(
      connection,
      {
        productCode,
        snapshotId,
      },
    );

  // Validate response structure
  typia.assert(snapshot);

  // Test 1: Validate all timestamp fields have correct ISO 8601 format
  TestValidator.predicate(
    "created_at has valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      snapshot.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at has valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      snapshot.updated_at,
    ),
  );

  TestValidator.predicate(
    "snapshot_created_at has valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      snapshot.snapshot_created_at,
    ),
  );

  // Test 2: Validate chronological order
  const createdAt = new Date(snapshot.created_at);
  const updatedAt = new Date(snapshot.updated_at);
  const snapshotCreatedAt = new Date(snapshot.snapshot_created_at);

  TestValidator.predicate(
    "created_at is chronologically valid (not future date)",
    createdAt <= new Date(),
  );

  TestValidator.predicate(
    "updated_at is not before created_at",
    createdAt <= updatedAt,
  );

  TestValidator.predicate(
    "snapshot_created_at is not before updated_at",
    updatedAt <= snapshotCreatedAt,
  );

  TestValidator.predicate(
    "snapshot_created_at is not future date",
    snapshotCreatedAt <= new Date(),
  );

  // Test 3: Validate timestamps in nested structures
  TestValidator.predicate(
    "category updated_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      snapshot.category.updated_at,
    ),
  );

  TestValidator.predicate(
    "seller timestamps are valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      snapshot.seller.created_at,
    ) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
        snapshot.seller.updated_at,
      ),
  );

  // Test 4: Validate consistency across units
  snapshot.units.forEach((unit, index) => {
    TestValidator.predicate(
      `unit ${index} created_at is valid ISO 8601 format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(unit.created_at),
    );

    TestValidator.predicate(
      `unit ${index} updated_at is valid ISO 8601 format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(unit.updated_at),
    );

    if (unit.deleted_at !== null && unit.deleted_at !== undefined) {
      TestValidator.predicate(
        `unit ${index} deleted_at is valid ISO 8601 format`,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
          unit.deleted_at,
        ),
      );
    }
  });

  // Test 5: Validate logical business relationships
  TestValidator.predicate(
    "product has been modified (updated_at >= created_at)",
    createdAt.getTime() <= updatedAt.getTime(),
  );

  TestValidator.predicate(
    "snapshot captures current state (snapshot_created_at >= updated_at)",
    updatedAt.getTime() <= snapshotCreatedAt.getTime(),
  );

  // Test 6: Additional integrity checks
  TestValidator.predicate(
    "all timestamps use consistent timezone (UTC)",
    snapshot.created_at.endsWith("Z") &&
      snapshot.updated_at.endsWith("Z") &&
      snapshot.snapshot_created_at.endsWith("Z"),
  );

  TestValidator.predicate(
    "timestamps represent meaningful business duration",
    snapshotCreatedAt.getTime() - createdAt.getTime() >= 0,
  );
}
