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
 * Test product detail retrieval including comprehensive audit trail information
 * with creation timestamps, last update timestamps, publication dates, and soft
 * deletion indicators. Validates data integrity tracking for marketplace
 * operations, seller activity monitoring, and catalog change management
 * supporting administrative oversight.
 */
export async function test_api_product_detail_audit_trail_information(
  connection: api.IConnection,
) {
  // Test 1: Generate random product code and retrieve product details
  const productCode = RandomGenerator.alphaNumeric(8).toUpperCase();

  const product = await api.functional.shoppingMall.products.at(connection, {
    productCode,
  });

  // Validate response structure and type safety
  typia.assert(product);

  // Test 2: Validate audit trail information - core temporal fields
  TestValidator.predicate(
    "created_at should be valid ISO datetime",
    new Date(product.created_at).toISOString() === product.created_at,
  );

  TestValidator.predicate(
    "updated_at should be valid ISO datetime",
    new Date(product.updated_at).toISOString() === product.updated_at,
  );

  TestValidator.predicate(
    "created_at should be earlier than or equal to updated_at",
    product.created_at <= product.updated_at,
  );

  // Test 3: Validate optional audit trail fields when present
  if (product.published_at !== null && product.published_at !== undefined) {
    TestValidator.predicate(
      "published_at should be valid ISO datetime when present",
      new Date(product.published_at).toISOString() === product.published_at,
    );

    TestValidator.predicate(
      "published_at should be after or equal to created_at",
      product.published_at >= product.created_at,
    );

    TestValidator.predicate(
      "published_at should be after or equal to category's update timestamp",
      product.published_at >= product.category.updated_at,
    );
  }

  if (product.deleted_at !== null && product.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at should be valid ISO datetime when present",
      new Date(product.deleted_at).toISOString() === product.deleted_at,
    );

    TestValidator.predicate(
      "deleted_at should be after created_at for logical deletion",
      product.deleted_at >= product.created_at,
    );

    TestValidator.predicate(
      "deleted_at should be after category's update timestamp",
      product.deleted_at >= product.category.updated_at,
    );
  }

  // Test 4: Validate comprehensive audit state consistency
  TestValidator.predicate(
    "if product is published, must be after category creation",
    product.published_at === null ||
      product.published_at === undefined ||
      (product.category.parent
        ? product.published_at >= product.category.parent.updated_at
        : true),
  );

  // Test 5: Validate seller audit information
  typia.assert<IShoppingMallSeller.ISummary>(product.seller);
  TestValidator.predicate(
    "seller has valid business email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      product.seller.email,
    ),
  );

  TestValidator.predicate(
    "seller has business context for audit validation",
    product.seller.business_name.length > 0 &&
      product.seller.phone.length > 0 &&
      product.seller.business_type.length > 0,
  );

  TestValidator.predicate(
    "seller timestamps are valid ISO datetime",
    new Date(product.seller.created_at).toISOString() ===
      product.seller.created_at &&
      new Date(product.seller.updated_at).toISOString() ===
        product.seller.updated_at,
  );

  TestValidator.predicate(
    "seller commission rate is valid for audit context",
    product.seller.commission_rate >= 0 &&
      product.seller.commission_rate <= 0.3,
  );

  TestValidator.predicate(
    "seller verification status has audit trail values",
    ["pending", "verified", "suspended", "rejected"].includes(
      product.seller.verification_status,
    ),
  );

  // Test 6: Validate comprehensive category audit trail
  typia.assert<IShoppingMallProductCategory.ISummary>(product.category);
  TestValidator.predicate(
    "category has valid hierarchical structure for audit",
    product.category.path.includes(product.category.code) &&
      product.category.level >= 0 &&
      product.category.level <= 10,
  );

  TestValidator.predicate(
    "category last updated timestamp is valid ISO datetime",
    new Date(product.category.updated_at).toISOString() ===
      product.category.updated_at,
  );

  TestValidator.predicate(
    "category level matches path depth for audit consistency",
    product.category.path.split("/").length === product.category.level + 1,
  );

  // Test 7: Validate review statistics comprehensive audit
  typia.assert<IShoppingMallProductReviewStatistics>(product.reviews);
  TestValidator.predicate(
    "review statistics last calculation timestamp is valid ISO datetime",
    new Date(product.reviews.last_calculation_at).toISOString() ===
      product.reviews.last_calculation_at,
  );

  TestValidator.predicate(
    "review timestamps are valid ISO datetime",
    new Date(product.reviews.created_at).toISOString() ===
      product.reviews.created_at &&
      new Date(product.reviews.updated_at).toISOString() ===
        product.reviews.updated_at,
  );

  TestValidator.predicate(
    "reviews calculation happened after product creation for audit consistency",
    product.reviews.last_calculation_at >= product.created_at,
  );

  TestValidator.predicate(
    "review ratings audit distribution is valid",
    [
      product.reviews.five_star_count ?? 0,
      product.reviews.four_star_count ?? 0,
      product.reviews.three_star_count ?? 0,
      product.reviews.two_star_count ?? 0,
      product.reviews.one_star_count ?? 0,
    ].some((count) => count > 0) || product.reviews.total_reviews === 0,
  );

  // Test 8: Validate product business audit compliance
  TestValidator.predicate(
    "product SKU is non-empty for audit identification",
    product.sku.length > 0,
  );

  TestValidator.predicate(
    "product name supports audit identification",
    product.name.length >= 2 && product.name.length <= 500,
  );

  TestValidator.predicate(
    "product audit tracking flags are valid",
    typeof product.track_quantity === "boolean" &&
      typeof product.allow_backorder === "boolean" &&
      typeof product.is_shipping_required === "boolean" &&
      typeof product.is_taxable === "boolean",
  );

  TestValidator.predicate(
    "product status has audit trail values",
    ["active", "draft", "archived"].includes(product.status),
  );

  // Test 9: Validate image audit consistency
  if (product.images.length > 0) {
    const primaryImages = product.images.filter((img) => img.is_primary);
    TestValidator.predicate(
      "exactly one primary image exists for audit",
      primaryImages.length === 1,
    );

    TestValidator.predicate(
      "primary image display order is 1 for audit consistency",
      primaryImages[0].display_order === 1,
    );
  }

  // Test 10: Validate price audit trail integrity
  TestValidator.predicate(
    "price is non-negative for audit purposes",
    product.price >= 0,
  );

  TestValidator.predicate(
    "compare_at_price acceptance for audit trail",
    product.compare_at_price === null ||
      product.compare_at_price === undefined ||
      product.compare_at_price > 0,
  );

  if (
    product.compare_at_price !== null &&
    product.compare_at_price !== undefined
  ) {
    TestValidator.predicate(
      "compare_at_price should be >= price for valid discount audit",
      product.compare_at_price >= product.price,
    );
  }

  // Test 11: Validate comprehensive audit state machine
  TestValidator.predicate(
    "product ID is valid UUID for audit trail",
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(product.id),
  );

  TestValidator.predicate(
    "product category parent audit consistency",
    !product.category.parent ||
      (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
        product.category.parent.id,
      ) &&
        product.category.level === product.category.parent.level + 1),
  );

  // Test 12: Validate SEO and metadata audit trail
  TestValidator.predicate(
    "SEO title is within audit length constraints when provided",
    !product.seo_title ||
      (product.seo_title.length >= 10 && product.seo_title.length <= 160),
  );

  TestValidator.predicate(
    "SEO description is within audit length constraints when provided",
    !product.seo_description ||
      (product.seo_description.length >= 50 &&
        product.seo_description.length <= 320),
  );

  TestValidator.predicate(
    "featured image URL format is valid for audit",
    !product.featured_image || /^https?:\/\//.test(product.featured_image),
  );
}
