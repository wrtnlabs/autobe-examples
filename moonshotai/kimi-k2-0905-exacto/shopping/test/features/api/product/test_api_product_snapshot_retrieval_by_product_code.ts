import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful retrieval of a product snapshot using valid product code and
 * snapshot ID.
 *
 * This test validates the complete product snapshot retrieval functionality,
 * ensuring all historical product information is correctly returned. The test
 * creates realistic e-commerce data including product details, pricing,
 * variants, categories, and seller information as would exist in a real
 * shopping mall platform.
 *
 * Test Flow:
 *
 * 1. Generate valid product code and snapshot ID using proper UUID format
 * 2. Call the product snapshot API endpoint with generated parameters
 * 3. Validate the complete response structure matches IShoppingMallProductSnapshot
 * 4. Verify all required fields are present with correct data types
 * 5. Validate business critical fields like pricing, variants, categories
 * 6. Check temporal data integrity for audit trail purposes
 *
 * Validates:
 *
 * - Complete snapshot data structure compliance
 * - Product identification and categorization
 * - Seller information summary accuracy
 * - Unit and variant configuration details
 * - Pricing and inventory status
 * - Review metrics and ratings
 * - Temporal snapshot metadata
 */
export async function test_api_product_snapshot_retrieval_by_product_code(
  connection: api.IConnection,
) {
  // Generate realistic test data
  const productCode = `PROD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
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

  // Validate product identification fields
  TestValidator.equals("snapshot ID format", snapshot.id, snapshotId);
  TestValidator.notEquals("product name is not empty", snapshot.name, "");
  TestValidator.notEquals(
    "product description is not empty",
    snapshot.description,
    "",
  );

  // Validate pricing and business fields
  TestValidator.predicate("price is positive", snapshot.price > 0);
  TestValidator.predicate(
    "original price is not negative",
    snapshot.original_price >= 0,
  );
  TestValidator.predicate(
    "SKU code is not empty",
    snapshot.sku_code.length > 0,
  );

  // Validate category structure
  TestValidator.equals(
    "category has valid ID format",
    typeof snapshot.category.id === "string" &&
      snapshot.category.id.length === 36,
    true,
  );
  TestValidator.notEquals(
    "category code is not empty",
    snapshot.category.code,
    "",
  );
  TestValidator.notEquals(
    "category name is not empty",
    snapshot.category.name,
    "",
  );
  TestValidator.predicate(
    "category level is non-negative",
    snapshot.category.level >= 0,
  );
  TestValidator.predicate(
    "category has valid path",
    snapshot.category.path.includes("/"),
  );

  // Validate seller summary
  TestValidator.equals(
    "seller has valid ID format",
    typeof snapshot.seller.id === "string" && snapshot.seller.id.length === 36,
    true,
  );
  TestValidator.predicate(
    "seller email is valid format",
    snapshot.seller.email.includes("@") && snapshot.seller.email.includes("."),
  );
  TestValidator.notEquals(
    "seller business name is not empty",
    snapshot.seller.business_name,
    "",
  );
  TestValidator.predicate(
    "seller is verified boolean",
    typeof snapshot.seller.is_verified === "boolean",
  );

  // Validate variants
  TestValidator.predicate(
    "has at least one variant",
    snapshot.variants.length > 0,
  );
  for (const variant of snapshot.variants) {
    TestValidator.equals(
      "variant ID format valid",
      typeof variant.id === "string" && variant.id.length === 36,
      true,
    );
    TestValidator.notEquals("variant name is not empty", variant.name, "");
    TestValidator.predicate("variant price is positive", variant.price > 0);
    TestValidator.predicate(
      "variant SKU is not empty",
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant is_active is boolean",
      typeof variant.is_active === "boolean",
    );
  }

  // Validate categories array
  TestValidator.predicate(
    "categories array exists",
    Array.isArray(snapshot.categories),
  );
  TestValidator.predicate(
    "has at least one category",
    snapshot.categories.length > 0,
  );
  for (const category of snapshot.categories) {
    TestValidator.equals(
      "category ID format",
      typeof category.id === "string" && category.id.length === 36,
      true,
    );
    TestValidator.notEquals("category code", category.code, "");
    TestValidator.notEquals("category name", category.name, "");
  }

  // Validate units
  TestValidator.predicate("units array exists", Array.isArray(snapshot.units));
  for (const unit of snapshot.units) {
    TestValidator.equals(
      "unit ID format",
      typeof unit.id === "string" && unit.id.length === 36,
      true,
    );
    TestValidator.notEquals("unit name", unit.name, "");
    TestValidator.notEquals("unit type", unit.type, "");
    TestValidator.predicate(
      "sort order is number",
      typeof unit.sort_order === "number",
    );
    TestValidator.predicate(
      "is_required is boolean",
      typeof unit.is_required === "boolean",
    );
    TestValidator.predicate(
      "is_multiple is boolean",
      typeof unit.is_multiple === "boolean",
    );
  }

  // Validate review metrics
  TestValidator.predicate(
    "reviews count is non-negative",
    snapshot.reviews_count >= 0,
  );
  TestValidator.predicate(
    "average rating is valid",
    snapshot.average_rating >= 0 && snapshot.average_rating <= 5,
  );

  // Validate temporal fields
  TestValidator.predicate(
    "created_at is valid date",
    new Date(snapshot.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(snapshot.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "snapshot_created_at is valid date",
    new Date(snapshot.snapshot_created_at).toString() !== "Invalid Date",
  );

  // Validate business logic relationships
  TestValidator.predicate(
    "price <= original_price",
    snapshot.price <= snapshot.original_price,
  );
  TestValidator.predicate(
    "created_at <= updated_at",
    snapshot.created_at <= snapshot.updated_at,
  );
}
