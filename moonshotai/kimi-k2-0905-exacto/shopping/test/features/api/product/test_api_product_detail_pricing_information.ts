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
 * Test product detail retrieval with comprehensive pricing information
 * including current selling price, original compare-at-price for discount
 * display, product cost for margin calculations, and tax applicability.
 * Validates pricing transparency for customer decision-making and seller
 * analytics supporting marketplace commission calculations.
 *
 * This test validates the complete pricing structure of products in the
 * marketplace by:
 *
 * 1. Retrieving detailed product information using the product code
 * 2. Verifying all pricing fields are present and properly structured
 * 3. Validating pricing relationships (compare-at-price >= current price when
 *    present)
 * 4. Ensuring seller information includes commission rate for analytics
 * 5. Checking inventory status is accurately reflected
 */
export async function test_api_product_detail_pricing_information(
  connection: api.IConnection,
) {
  // Generate realistic product code
  const productCode =
    RandomGenerator.alphabets(6) + RandomGenerator.alphaNumeric(4);

  // Retrieve comprehensive product details
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productCode,
    });
  typia.assert(product);

  // Validate core pricing structure
  TestValidator.predicate(
    "product price should be non-negative",
    product.price >= 0,
  );
  TestValidator.predicate("product has valid SKU", product.sku.length > 0);
  TestValidator.predicate(
    "seller commission rate exists",
    typeof product.seller.commission_rate === "number",
  );

  // Validate pricing relationships for products with discounts
  if (
    product.compare_at_price !== null &&
    product.compare_at_price !== undefined
  ) {
    TestValidator.predicate(
      "compare-at-price should be greater than or equal to current price",
      product.compare_at_price >= product.price,
    );
    TestValidator.predicate(
      "compare-at-price should be positive when present",
      product.compare_at_price > 0,
    );
  }

  // Validate cost information for seller margin calculations
  if (product.cost !== null && product.cost !== undefined) {
    TestValidator.predicate(
      "product cost should be non-negative when present",
      product.cost >= 0,
    );
    TestValidator.predicate(
      "current price should be greater than or equal to cost",
      product.price >= product.cost,
    );
  }

  // Validate tax applicability
  TestValidator.predicate(
    "tax applicability flag exists",
    typeof product.is_taxable === "boolean",
  );
  TestValidator.predicate(
    "product status is valid",
    product.status === "active" ||
      product.status === "draft" ||
      product.status === "archived",
  );

  // Validate pricing transparency features
  TestValidator.predicate(
    "product name exists for identification",
    product.name.length > 0,
  );
  TestValidator.predicate(
    "product description exists for transparency",
    product.description.length > 0,
  );

  // Validate inventory status for availability
  TestValidator.predicate(
    "track_quantity should be boolean",
    typeof product.track_quantity === "boolean",
  );
  TestValidator.predicate(
    "allow_backorder should be boolean",
    typeof product.allow_backorder === "boolean",
  );

  // Validate essential product metadata
  TestValidator.predicate(
    "product condition is valid",
    product.condition.length > 0,
  );
  TestValidator.predicate(
    "product variants array exists",
    Array.isArray(product.variants),
  );
  TestValidator.predicate(
    "product images array exists",
    Array.isArray(product.images),
  );

  // Validate seller information completeness for analytics
  const seller = product.seller;
  TestValidator.predicate(
    "seller has business name",
    seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "seller has verification status",
    typeof seller.verification_status === "string",
  );
  TestValidator.predicate(
    "seller commission rate is non-negative",
    seller.commission_rate >= 0,
  );

  // Validate category information
  TestValidator.predicate(
    "category code exists",
    product.category.code.length > 0,
  );
  TestValidator.predicate(
    "category name exists",
    product.category.name.length > 0,
  );
  TestValidator.predicate(
    "category path exists",
    product.category.path.length > 0,
  );
}
