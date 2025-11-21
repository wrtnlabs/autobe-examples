import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate comprehensive product snapshot retrieval with variant-level auditing
 * capabilities.
 *
 * This test ensures that the product snapshot system correctly captures and
 * returns historical product states, including complete variant information,
 * pricing data, availability status, and audit trail metadata. The test
 * validates the integrity of historical product data which is essential for
 * business intelligence analysis, regulatory compliance, and seller
 * accountability tracking in an e-commerce marketplace environment.
 *
 * The test focuses on verifying:
 *
 * 1. Complete product snapshot data with all required fields
 * 2. Variant-specific information including SKU codes and pricing
 * 3. Category and seller relationships
 * 4. Audit timestamps and metadata accuracy
 * 5. Business logic validation of pricing and product status
 *
 * @param connection - The API connection for making requests
 * @returns Promise<void> - Resolves when test completes successfully
 */
export async function test_api_product_snapshot_variant_level_auditing(
  connection: api.IConnection,
) {
  // Generate realistic test data for product code and snapshot ID
  const productCode = RandomGenerator.alphaNumeric(12);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve product snapshot with full variant data
  const snapshot =
    await api.functional.shoppingMall.products.snapshots.atSnapshot(
      connection,
      {
        productCode,
        snapshotId,
      },
    );

  // Validate complete response structure
  typia.assert(snapshot);

  // Validate business-critical fields
  TestValidator.predicate(
    "product snapshot has name",
    snapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has description",
    snapshot.description.length > 0,
  );
  TestValidator.predicate("valid price structure", snapshot.price > 0);
  TestValidator.predicate("valid original price", snapshot.original_price >= 0);
  TestValidator.predicate(
    "SKU code is non-empty",
    snapshot.sku_code.length > 0,
  );

  // Validate variant-specific data
  TestValidator.predicate(
    "has variant configurations",
    snapshot.variants.length > 0,
  );

  // Validate each variant has required fields
  snapshot.variants.forEach((variant, index) => {
    TestValidator.predicate(
      `variant ${index} has valid ID`,
      variant.id.length > 0,
    );
    TestValidator.predicate(
      `variant ${index} has name`,
      variant.name.length > 0,
    );
    TestValidator.predicate(
      `variant ${index} has SKU code`,
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      `variant ${index} has valid price`,
      variant.price >= 0,
    );
  });

  // Validate category structure
  TestValidator.predicate(
    "has valid category ID",
    snapshot.category.id.length > 0,
  );
  TestValidator.predicate(
    "has category code",
    snapshot.category.code.length > 0,
  );
  TestValidator.predicate(
    "has category name",
    snapshot.category.name.length > 0,
  );
  TestValidator.predicate(
    "has valid category path",
    snapshot.category.path.length > 0,
  );

  // Validate seller information
  TestValidator.predicate("has valid seller ID", snapshot.seller.id.length > 0);
  TestValidator.predicate("has seller email", snapshot.seller.email.length > 0);
  TestValidator.predicate(
    "has business name",
    snapshot.seller.business_name.length > 0,
  );

  // Validate time-based audit data
  TestValidator.predicate(
    "has valid reviews count",
    snapshot.reviews_count >= 0,
  );
  TestValidator.predicate(
    "has valid average rating",
    snapshot.average_rating >= 0 && snapshot.average_rating <= 5,
  );

  // Validate timestamp formatting
  TestValidator.predicate(
    "created_at is valid date-time format",
    !isNaN(Date.parse(snapshot.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    !isNaN(Date.parse(snapshot.updated_at)),
  );
  TestValidator.predicate(
    "snapshot_created_at is valid date-time format",
    !isNaN(Date.parse(snapshot.snapshot_created_at)),
  );

  // Business intelligence validation
  TestValidator.predicate(
    "price is less than or equal to original price",
    snapshot.price <= snapshot.original_price,
  );

  TestValidator.predicate(
    "category has proper hierarchy depth",
    snapshot.category.level >= 0,
  );
}
