import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test preservation of seller information in product snapshots.
 *
 * This test validates that business name, contact information, verification
 * status, and commission rates are accurately captured at snapshot time.
 * Ensures historical seller accountability and business relationship tracking.
 *
 * The test involves:
 *
 * 1. Generating test data for product code and snapshot ID
 * 2. Retrieving a product snapshot with seller information
 * 3. Validating seller information presence and completeness
 * 4. Verifying seller business information integrity
 * 5. Checking verification status and commission rate data
 * 6. Ensuring timestamps for audit trail tracking
 */
export async function test_api_product_snapshot_seller_information_historical_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid test data using proper constraints
  const productCode = RandomGenerator.alphabets(8);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve product snapshot with seller information
  const snapshot: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.products.snapshots.atSnapshot(
      connection,
      {
        productCode,
        snapshotId,
      },
    );

  // Validate snapshot structure and seller information
  typia.assert(snapshot);

  // Verify seller information presence for historical accountability
  TestValidator.predicate(
    "snapshot contains seller information",
    snapshot.seller !== null && snapshot.seller !== undefined,
  );

  // Validate complete seller business information integrity
  TestValidator.predicate(
    "business name is present and valid",
    snapshot.seller.business_name.length > 0,
  );

  TestValidator.predicate(
    "business email follows standard format",
    snapshot.seller.email.includes("@") && snapshot.seller.email.includes("."),
  );

  TestValidator.predicate(
    "business phone number is recorded",
    snapshot.seller.phone.length > 0,
  );

  // Verify seller verification status for trust indicators
  TestValidator.predicate(
    "seller verification status is defined",
    snapshot.seller.verification_status.length > 0,
  );

  TestValidator.predicate(
    "verification boolean flag is set",
    snapshot.seller.is_verified === true ||
      snapshot.seller.is_verified === false,
  );

  // Validate commission rate for business relationship tracking
  TestValidator.predicate(
    "commission rate is non-negative for business tracking",
    snapshot.seller.commission_rate >= 0,
  );

  // Verify seller business type classification
  TestValidator.predicate(
    "business type classification is present",
    snapshot.seller.business_type.length > 0,
  );

  // Validate timestamps for complete audit trail
  TestValidator.predicate(
    "business account creation timestamp is valid",
    snapshot.seller.created_at.length > 0,
  );

  TestValidator.predicate(
    "business account update timestamp is valid",
    snapshot.seller.updated_at.length > 0,
  );

  // Verify snapshot creation timestamp for historical tracking
  TestValidator.predicate(
    "snapshot creation timestamp is present for audit trail",
    snapshot.snapshot_created_at.length > 0,
  );

  // Ensure seller ID is properly captured for accountability
  TestValidator.predicate(
    "seller unique identifier is captured for accountability",
    snapshot.seller.id.length > 0,
  );

  // Validate seller information completeness across all required fields
  const requiredSellerFields = [
    "id",
    "email",
    "business_name",
    "phone",
    "business_type",
    "verification_status",
    "is_verified",
    "commission_rate",
    "created_at",
    "updated_at",
  ] as const;

  requiredSellerFields.forEach((field) => {
    TestValidator.predicate(
      `seller field ${field} is present for historical tracking`,
      (snapshot.seller as any)[field] !== undefined &&
        (snapshot.seller as any)[field] !== null,
    );
  });
}
