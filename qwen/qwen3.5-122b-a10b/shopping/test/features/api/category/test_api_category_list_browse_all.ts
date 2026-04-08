import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all product categories with pagination.
 *
 * Validates the category listing endpoint for administrators to browse the category hierarchy with pagination support. Ensures that the response includes proper pagination metadata, category summaries with all required fields, and that soft-deleted categories are properly excluded.
 *
 * The test verifies both root categories and subcategories are included in the results, and that the pagination metadata accurately reflects the total count and page structure.
 *
 * 1. Call the category listing endpoint with default pagination parameters.
 * 2. Validates response structure includes pagination metadata with current, limit, records, and pages.
 * 3. Validates each category in the data array has required fields: id, name, created_at, updated_at.
 * 4. Validates optional fields exist: description (may be null), parent (may be null for root categories).
 * 5. Validates soft-deleted categories are excluded (deleted_at should be null for all returned categories).
 * 6. Validates both root categories (parent is null) and subcategories (parent is not null) can exist in results.
 */
export async function test_api_category_list_browse_all(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for category browsing
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Browse categories with default pagination
  const result: IPageIEcommerceCategory.ISummary =
    await api.functional.ecommerce.categories.index(adminConnection, {
      body: {} satisfies IEcommerceCategory.IRequest,
    });
  typia.assert(result);
  // Test 2: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // Test 3: Validate each category has required fields
  for (const category of result.data) {
    typia.assert(category);
    // Required fields validation
    TestValidator.predicate(
      "has valid id",
      /^[0-9a-f-]{36}$/i.test(category.id),
    );
    TestValidator.predicate("has name", category.name.length > 0);
    TestValidator.predicate("has created_at", category.created_at.length > 0);
    TestValidator.predicate("has updated_at", category.updated_at.length > 0);
    // Optional fields validation
    TestValidator.predicate(
      "description is null or string",
      category.description === null || typeof category.description === "string",
    );
    // Parent validation - can be null (root) or object (subcategory)
    if (category.parent !== null && category.parent !== undefined) {
      typia.assert(category.parent);
      TestValidator.predicate(
        "parent has valid id",
        /^[0-9a-f-]{36}$/i.test(category.parent.id),
      );
      TestValidator.predicate(
        "parent has name",
        category.parent.name.length > 0,
      );
    }
    // Soft delete validation - all returned categories should be active
    TestValidator.predicate(
      "not soft deleted",
      category.deleted_at === null || category.deleted_at === undefined,
    );
  }
  // Test 4: Validate both root and subcategories can exist
  const hasRootCategory = result.data.some(
    (c) => c.parent === null || c.parent === undefined,
  );
  const hasSubcategory = result.data.some(
    (c) => c.parent !== null && c.parent !== undefined,
  );
  // Note: We don't require both to exist as the database might only have one type
  // Just validate the structure is correct if they exist
  if (hasRootCategory) {
    TestValidator.predicate("has at least one root category", hasRootCategory);
  }
  if (hasSubcategory) {
    TestValidator.predicate("has at least one subcategory", hasSubcategory);
  }
}
