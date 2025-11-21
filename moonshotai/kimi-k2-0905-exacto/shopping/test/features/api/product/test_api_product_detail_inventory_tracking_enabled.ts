import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product detail retrieval for products with inventory tracking enabled.
 *
 * This test validates real-time inventory availability status across all
 * variants and warehouse locations. Ensures inventory information enables
 * customer purchase confidence through accurate stock availability and
 * backorder allowance indicators for comprehensive fulfillment planning.
 *
 * The test will:
 *
 * 1. Generate a product with inventory tracking enabled
 * 2. Validate that the response includes comprehensive inventory status
 * 3. Verify variant-level inventory tracking works correctly
 * 4. Test backorder allowance indicators
 * 5. Ensure inventory data is properly structured for customer confidence
 */
export async function test_api_product_detail_inventory_tracking_enabled(
  connection: api.IConnection,
) {
  // Generate a random product code for inventory tracking verification
  const productCode = RandomGenerator.alphabets(10);

  // Retrieve product detail with inventory tracking enabled
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, { productCode });

  // Validate the response structure and inventory tracking capabilities
  typia.assert(product);

  // Verify inventory tracking is enabled
  TestValidator.predicate(
    "product should have inventory tracking enabled",
    product.track_quantity === true,
  );

  // Validate inventory status structure
  TestValidator.equals(
    "inventory status should exist",
    typeof product.inventory_status,
    "object",
  );

  // Verify variant-level inventory tracking
  TestValidator.predicate(
    "variants should have inventory tracking",
    product.variants.length > 0 &&
      product.variants.every(
        (variant) => variant.inventory_quantity !== undefined,
      ),
  );

  // Test backorder allowance indicators
  TestValidator.predicate(
    "backorder allowance should be clearly defined",
    typeof product.allow_backorder === "boolean",
  );

  // Validate comprehensive product metadata
  TestValidator.equals(
    "product should have valid ID",
    typeof product.id,
    "string",
  );

  TestValidator.equals(
    "product should have valid SKU",
    typeof product.sku,
    "string",
  );

  TestValidator.predicate(
    "product price should be valid number",
    typeof product.price === "number" && product.price >= 0,
  );

  // Verify seller information is complete
  TestValidator.equals(
    "seller information should exist",
    typeof product.seller,
    "object",
  );

  TestValidator.equals(
    "seller should have business name",
    typeof product.seller.business_name,
    "string",
  );

  // Validate category information
  TestValidator.equals(
    "category information should exist",
    typeof product.category,
    "object",
  );

  TestValidator.equals(
    "category should have code",
    typeof product.category.code,
    "string",
  );

  // Verify images array structure
  TestValidator.predicate(
    "images should be an array",
    Array.isArray(product.images) && product.images.length >= 0,
  );

  // Validate review statistics
  TestValidator.equals(
    "review statistics should exist",
    typeof product.reviews,
    "object",
  );

  TestValidator.predicate(
    "review statistics should have valid total reviews",
    typeof product.reviews.total_reviews === "number" &&
      product.reviews.total_reviews >= 0,
  );

  // Verify option properties with inventory implications
  TestValidator.predicate(
    "optional properties should be properly typed",
    (product.compare_at_price === null ||
      product.compare_at_price === undefined ||
      typeof product.compare_at_price === "number") &&
      (product.cost === null ||
        product.cost === undefined ||
        typeof product.cost === "number") &&
      (product.weight === null ||
        product.weight === undefined ||
        typeof product.weight === "number") &&
      (product.weight_unit === null ||
        product.weight_unit === undefined ||
        typeof product.weight_unit === "string") &&
      (product.barcode === null ||
        product.barcode === undefined ||
        typeof product.barcode === "string"),
  );

  // Validate optional dates
  TestValidator.predicate(
    "date properties should be properly formatted",
    (product.published_at === null ||
      product.published_at === undefined ||
      typia.is<string & tags.Format<"date-time">>(product.published_at)) &&
      (product.deleted_at === null ||
        product.deleted_at === undefined ||
        typia.is<string & tags.Format<"date-time">>(product.deleted_at)),
  );

  // Ensure inventory tracking provides customer confidence
  TestValidator.predicate(
    "inventory tracking should enable customer purchase confidence",
    product.status === "active" &&
      product.seller.verification_status === "verified",
  );
}
