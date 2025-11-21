import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Validate comprehensive SEO metadata for product categories in the shopping
 * mall marketplace.
 *
 * This test ensures that product categories are properly configured for maximum
 * search engine visibility and provide optimal content for search result
 * snippets. The test validates:
 *
 * 1. Category retrieval with complete SEO metadata (title, description, keywords)
 * 2. Hierarchical path structure for breadcrumb navigation
 * 3. SEO field validation including character limits and content quality
 * 4. Category code reference system for API and URL routing
 * 5. Parent-child relationships for proper categorization tree
 * 6. Display configuration including active status and sorting
 * 7. Visual assets like category images for enhanced navigation
 * 8. Product count tracking for category popularity indicators
 *
 * The test ensures that category pages are optimized for search engine ranking
 * through comprehensive metadata configuration while maintaining excellent user
 * experience for product discovery and intuitive navigation paths.
 */
export async function test_api_category_seo_metadata_validation(
  connection: api.IConnection,
) {
  // Test root category with SEO optimization
  const rootCategoryCode = RandomGenerator.pick([
    "electronics",
    "clothing",
    "home-garden",
    "sports",
    "books",
  ] as const);

  const rootCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryCode: rootCategoryCode,
    });
  typia.assert(rootCategory);

  // Validate root category core information
  await TestValidator.equals(
    "root category code matches",
    rootCategory.code,
    rootCategoryCode,
  );
  await TestValidator.predicate(
    "root category name is valid",
    rootCategory.name.length >= 1 && rootCategory.name.length <= 100,
  );
  await TestValidator.predicate(
    "root category path is non-empty",
    rootCategory.path.length >= 1,
  );
  await TestValidator.predicate(
    "root category level is 0 for root",
    rootCategory.level === 0,
  );
  await TestValidator.predicate(
    "root sort order is valid",
    rootCategory.sort_order >= 0 && rootCategory.sort_order <= 9999,
  );

  // Validate root SEO metadata for search engine optimization
  await TestValidator.predicate(
    "root meta title exists and is SEO optimized",
    rootCategory.meta_title !== null &&
      rootCategory.meta_title !== undefined &&
      rootCategory.meta_title.length <= 60 &&
      rootCategory.meta_title.includes(rootCategory.name),
  );

  await TestValidator.predicate(
    "root meta description exists and is SEO optimized",
    rootCategory.meta_description !== null &&
      rootCategory.meta_description !== undefined &&
      rootCategory.meta_description.length <= 160 &&
      rootCategory.meta_description.length >= 50,
  );

  await TestValidator.predicate(
    "root meta keywords exist and are within limit",
    rootCategory.meta_keywords !== null &&
      rootCategory.meta_keywords !== undefined &&
      rootCategory.meta_keywords.length <= 500 &&
      rootCategory.meta_keywords.split(",").length >= 3,
  );

  // Validate root status and visibility
  await TestValidator.predicate(
    "root category has valid active status",
    typia.is<boolean>(rootCategory.is_active),
  );
  await TestValidator.predicate(
    "root category has valid featured status",
    typia.is<boolean>(rootCategory.is_featured),
  );

  // Validate optional root description
  if (rootCategory.description) {
    await TestValidator.predicate(
      "root description length is valid",
      rootCategory.description.length <= 2000,
    );
  }

  // Validate root image URL if present
  if (rootCategory.image) {
    await TestValidator.predicate(
      "root image URL length is valid",
      rootCategory.image.length <= 500,
    );
    await TestValidator.predicate(
      "root image URL has valid format",
      typia.is<string & tags.Format<"uri">>(rootCategory.image),
    );
  }

  // Validate UUID and hierarchical structure for root
  await TestValidator.predicate(
    "root UUID format is valid",
    typia.is<string & tags.Format<"uuid">>(rootCategory.id),
  );
  await TestValidator.predicate(
    "root has no parent",
    rootCategory.parent_id === null,
  );
  await TestValidator.predicate(
    "root has no parent summary",
    rootCategory.parent === undefined,
  );

  // Validate root timestamps
  await TestValidator.predicate(
    "root created_at timestamp is valid",
    typia.is<string & tags.Format<"date-time">>(rootCategory.created_at),
  );
  await TestValidator.predicate(
    "root updated_at timestamp is valid",
    typia.is<string & tags.Format<"date-time">>(rootCategory.updated_at),
  );

  if (rootCategory.deleted_at) {
    await TestValidator.predicate(
      "root deleted_at timestamp is valid",
      typia.is<string & tags.Format<"date-time">>(rootCategory.deleted_at),
    );
  }

  // Test sub-category with different SEO profile
  const subCategoryCode = RandomGenerator.pick([
    "smartphones",
    "laptops",
    "mens-shirts",
    "kitchen-appliances",
    "fitness-equipment",
  ] as const);

  const subCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryCode: subCategoryCode,
    });
  typia.assert(subCategory);

  // Validate sub-category with hierarchical context
  await TestValidator.predicate(
    "sub-category level is greater than 0",
    subCategory.level > 0,
  );

  if (subCategory.parent) {
    await TestValidator.predicate(
      "sub-category parent has valid structure",
      typia.is<IShoppingMallProductCategory.ISummary>(subCategory.parent),
    );
    await TestValidator.predicate(
      "sub-category parent level is one less than current",
      subCategory.parent.level === subCategory.level - 1,
    );
    await TestValidator.predicate(
      "sub-category parent ID matches",
      subCategory.parent_id === subCategory.parent.id,
    );
    await TestValidator.predicate(
      "sub-category parent has name",
      subCategory.parent.name.length > 0,
    );
  }

  // Validate sub-category SEO optimization differences
  if (subCategory.meta_title) {
    await TestValidator.predicate(
      "sub-category meta title includes specific category context",
      subCategory.meta_title.includes(subCategory.name) ||
        subCategory.meta_title.includes(subCategory.path),
    );
  }

  if (subCategory.meta_description) {
    await TestValidator.predicate(
      "sub-category meta description is more specific",
      subCategory.meta_description.length >= 30 &&
        subCategory.meta_description.length <= 160,
    );
  }

  // Validate both categories have proper identifiers
  await TestValidator.predicate(
    "both categories have different IDs",
    rootCategory.id !== subCategory.id,
  );
  await TestValidator.predicate(
    "both categories have different paths",
    rootCategory.path !== subCategory.path,
  );

  // Final comprehensive validation
  await TestValidator.predicate(
    "category codes are realistic",
    rootCategory.code.length > 0 && subCategory.code.length > 0,
  );
  await TestValidator.predicate(
    "category names are realistic",
    rootCategory.name.includes(" ") === false &&
      subCategory.name.includes(" ") === false,
  );
  await TestValidator.predicate(
    "timestamps are chronologically correct",
    new Date(rootCategory.updated_at).getTime() >=
      new Date(rootCategory.created_at).getTime(),
  );
}
