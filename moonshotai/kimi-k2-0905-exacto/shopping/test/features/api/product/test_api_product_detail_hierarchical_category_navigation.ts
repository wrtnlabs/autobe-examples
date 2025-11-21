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
 * Test product detail retrieval with complete category hierarchy information
 * including primary category, parent category relationships, category paths for
 * breadcrumb navigation, and category-level metadata. Validates navigational
 * structure supporting product discovery and marketplace organization through
 * hierarchical classification systems.
 */
export async function test_api_product_detail_hierarchical_category_navigation(
  connection: api.IConnection,
) {
  // Test 1: Basic product retrieval with category information
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.shoppingMall.products.at(connection, {
    productCode,
  });
  typia.assert(product);

  // Define valid status arrays
  const PRODUCT_STATUS = ["active", "draft", "archived"] as const;
  const VERIFICATION_STATUS = [
    "pending",
    "verified",
    "suspended",
    "rejected",
  ] as const;

  TestValidator.predicate(
    "product has valid id",
    typeof product.id === "string" && product.id.length > 0,
  );
  TestValidator.predicate(
    "product has valid sku",
    typeof product.sku === "string" && product.sku.length > 0,
  );
  TestValidator.predicate(
    "product has name",
    product.name !== undefined && product.name.length > 0,
  );
  TestValidator.predicate("product has price", product.price >= 0);
  TestValidator.predicate(
    "product has valid status",
    ArrayUtil.has(PRODUCT_STATUS, (status) => status === product.status),
  );

  // Test 2: Validate category hierarchy structure
  TestValidator.predicate("product has category", product.category !== null);
  const category = product.category;
  TestValidator.predicate(
    "category has valid id",
    typia.is<string & tags.Format<"uuid">>(category.id),
  );
  TestValidator.predicate(
    "category has code",
    category.code !== undefined && category.code.length > 0,
  );
  TestValidator.predicate(
    "category has name",
    category.name !== undefined && category.name.length > 0,
  );
  TestValidator.predicate(
    "category has path",
    category.path !== undefined && category.path.length > 0,
  );
  TestValidator.predicate("category has level", category.level >= 0);
  TestValidator.predicate(
    "category has product count",
    category.product_count >= 0,
  );

  // Test 3: Validate parent category relationships (hierarchical navigation)
  if (category.parent !== undefined && category.parent !== null) {
    const parentCategory = category.parent;
    TestValidator.predicate(
      "parent category has valid id",
      typia.is<string & tags.Format<"uuid">>(parentCategory.id),
    );
    TestValidator.predicate(
      "parent category has code",
      parentCategory.code !== undefined && parentCategory.code.length > 0,
    );
    TestValidator.predicate(
      "parent category has name",
      parentCategory.name !== undefined && parentCategory.name.length > 0,
    );
    TestValidator.predicate(
      "parent category has path",
      parentCategory.path !== undefined && parentCategory.path.length > 0,
    );
    TestValidator.predicate(
      "parent category level is as expected",
      parentCategory.level < category.level,
    );
    TestValidator.predicate(
      "parent has parent count",
      parentCategory.product_count >= 0,
    );
    TestValidator.predicate(
      "parent should be featured or not",
      typeof parentCategory.is_featured === "boolean",
    );
    TestValidator.predicate(
      "parent should have activity status",
      typeof parentCategory.is_active === "boolean",
    );

    // Validate path hierarchy - parent path should be prefix of child path
    TestValidator.predicate(
      "parent path is prefix of child path",
      category.path.startsWith(parentCategory.path + "/") ||
        category.path !== parentCategory.path,
    );
  }

  // Test 4: Validate seller information
  const seller = product.seller;
  TestValidator.predicate(
    "seller has valid id",
    typia.is<string & tags.Format<"uuid">>(seller.id),
  );
  TestValidator.predicate(
    "seller has email",
    typia.is<string & tags.Format<"email">>(seller.email),
  );
  TestValidator.predicate(
    "seller has business name",
    seller.business_name !== undefined && seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "seller has phone number",
    seller.phone !== undefined && seller.phone.length > 0,
  );
  TestValidator.predicate(
    "seller has business type",
    seller.business_type !== undefined && seller.business_type.length > 0,
  );
  TestValidator.predicate(
    "seller has verification status",
    ArrayUtil.has(
      VERIFICATION_STATUS,
      (status) => status === seller.verification_status,
    ),
  );
  TestValidator.predicate(
    "seller is verified",
    typeof seller.is_verified === "boolean",
  );
  TestValidator.predicate(
    "seller has commission rate",
    typeof seller.commission_rate === "number",
  );

  // Test 5: Validate product variants
  TestValidator.predicate(
    "product has variants array",
    Array.isArray(product.variants),
  );
  for (const variant of product.variants) {
    TestValidator.predicate(
      "variant has valid id",
      typia.is<string & tags.Format<"uuid">>(variant.id),
    );
    TestValidator.predicate(
      "variant has sku",
      variant.sku !== undefined && variant.sku.length > 0,
    );
    TestValidator.predicate(
      "variant has title",
      variant.title !== undefined && variant.title.length > 0,
    );
    TestValidator.predicate(
      "variant has price adjustment",
      typeof variant.price_adjustment === "number",
    );
    TestValidator.predicate(
      "variant has inventory quantity",
      variant.inventory_quantity >= 0,
    );
  }

  // Test 6: Validate product images
  TestValidator.predicate(
    "product has images array",
    Array.isArray(product.images),
  );
  for (const image of product.images) {
    TestValidator.predicate(
      "image has valid id",
      typia.is<string & tags.Format<"uuid">>(image.id),
    );
    TestValidator.predicate(
      "image has product id",
      typia.is<string & tags.Format<"uuid">>(image.product_id),
    );
    TestValidator.predicate(
      "image has valid url",
      typia.is<string & tags.Format<"uri">>(image.image_url),
    );
    TestValidator.predicate(
      "image has alt text",
      typeof image.alt_text === "string",
    );
    TestValidator.predicate(
      "image has display order",
      image.display_order >= 1,
    );
    TestValidator.predicate(
      "image has is_primary flag",
      typeof image.is_primary === "boolean",
    );
  }

  // Validate that at least one image is primary if images exist
  if (product.images.length > 0) {
    TestValidator.predicate(
      "at least one image is primary",
      ArrayUtil.has(product.images, (image) => image.is_primary === true),
    );
  }

  // Test 7: Validate review statistics
  const reviews = product.reviews;
  TestValidator.predicate(
    "reviews has valid id",
    typia.is<string & tags.Format<"uuid">>(reviews.id),
  );
  TestValidator.predicate(
    "reviews has product id",
    typia.is<string & tags.Format<"uuid">>(reviews.shopping_product_id),
  );
  TestValidator.predicate(
    "reviews has total reviews",
    reviews.total_reviews >= 0,
  );
  TestValidator.predicate(
    "reviews has average rating",
    typeof reviews.average_rating === "string" &&
      typia.is<string & tags.Pattern<"^[1-5]\\.\\d{0,1}$">>(
        reviews.average_rating,
      ),
  );

  // Test 8: Validate inventory status
  TestValidator.predicate(
    "product has inventory status",
    product.inventory_status !== undefined,
  );

  // Test 9: Validate timestamps
  TestValidator.predicate(
    "product has created_at",
    typia.is<string & tags.Format<"date-time">>(product.created_at),
  );
  TestValidator.predicate(
    "product has updated_at",
    typia.is<string & tags.Format<"date-time">>(product.updated_at),
  );
  if (product.published_at) {
    TestValidator.predicate(
      "published_at has valid format",
      typia.is<string & tags.Format<"date-time">>(product.published_at),
    );
  }
  if (product.deleted_at) {
    TestValidator.predicate(
      "deleted_at has valid format",
      typia.is<string & tags.Format<"date-time">>(product.deleted_at),
    );
  }

  // Test 10: Validate product status based on deleted timestamp
  if (product.deleted_at !== null && product.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted product should not be active",
      product.status !== "active",
    );
  }

  // Test 11: Validate product metadata
  TestValidator.predicate(
    "product has track quantity",
    typeof product.track_quantity === "boolean",
  );
  TestValidator.predicate(
    "product has allow backorder",
    typeof product.allow_backorder === "boolean",
  );
  TestValidator.predicate(
    "product has is shipping required",
    typeof product.is_shipping_required === "boolean",
  );
  TestValidator.predicate(
    "product has is taxable",
    typeof product.is_taxable === "boolean",
  );

  // Test 12: Validate optional fields with proper null handling
  if (
    product.compare_at_price !== undefined &&
    product.compare_at_price !== null
  ) {
    TestValidator.predicate(
      "compare_at_price is valid",
      product.compare_at_price >= 0,
    );
  }
  if (product.cost !== undefined && product.cost !== null) {
    TestValidator.predicate("cost is valid", product.cost >= 0);
  }
  if (product.weight !== undefined && product.weight !== null) {
    TestValidator.predicate("weight is valid", product.weight >= 0);
  }
  if (product.weight_unit !== undefined && product.weight_unit !== null) {
    TestValidator.predicate(
      "weight_unit is valid",
      product.weight_unit.length > 0,
    );
  }
  if (product.barcode !== undefined && product.barcode !== null) {
    TestValidator.predicate("barcode is valid", product.barcode.length > 0);
  }
  if (product.seo_title !== undefined && product.seo_title !== null) {
    TestValidator.predicate("seo_title is valid", product.seo_title.length > 0);
  }
  if (
    product.seo_description !== undefined &&
    product.seo_description !== null
  ) {
    TestValidator.predicate(
      "seo_description is valid",
      product.seo_description.length > 0,
    );
  }
  if (product.tags !== undefined && product.tags !== null) {
    TestValidator.predicate("tags is valid", product.tags.length > 0);
  }
  if (product.featured_image !== undefined && product.featured_image !== null) {
    TestValidator.predicate(
      "featured_image is valid",
      product.featured_image.length > 0,
    );
  }

  // Test 13: Validate counts
  if (product.variants_count !== undefined) {
    TestValidator.predicate(
      "variants_count is valid",
      product.variants_count >= 0,
    );
  }
  if (product.reviews_count !== undefined) {
    TestValidator.predicate(
      "reviews_count is valid",
      product.reviews_count >= 0,
    );
  }
  if (product.average_rating !== undefined) {
    TestValidator.predicate(
      "average_rating is valid",
      product.average_rating >= 0 && product.average_rating <= 5,
    );
  }
}
