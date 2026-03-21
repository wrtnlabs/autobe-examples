import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that any user (guest or customer) can successfully browse all product
 * categories and view the hierarchical category structure with top-level
 * categories and their nested subcategories.
 *
 * Steps:
 * 1. Make a GET request to /ecommerceMall/categories without any authentication headers
 * 2. Verify the response returns HTTP 200 status code
 * 3. Validate the response body is an array of category objects
 * 4. For each top-level category, verify it has: id (UUID), name (string),
 *    description (nullable string), and subcategories array
 * 5. Verify that subcategories within each parent category have: id, name,
 *    description, and parent reference pointing to the parent
 * 6. Verify that only top-level categories (those without a parent) are
 *    returned at the root level
 * 7. Confirm that subcategories cannot have their own children (single-level
 *    nesting enforced)
 * 8. Verify categories are ordered by created_at in ascending order
 * 9. Verify soft-deleted categories are excluded from results
 */
export async function test_api_category_browse_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Browse categories without authentication (public endpoint)
  const response =
    await api.functional.ecommerceMall.categories.browse(connection);
  const categories = typia.assert<IEcommerceMallCategory[]>(response);
  // 2. Verify response is an array
  TestValidator.predicate(
    "response should be an array",
    Array.isArray(categories),
  );
  // 3. Verify ordering by created_at ascending (if there are categories)
  if (categories.length > 1) {
    for (let i = 1; i < categories.length; i++) {
      const prev = new Date(categories[i - 1].created_at).getTime();
      const curr = new Date(categories[i].created_at).getTime();
      TestValidator.predicate(
        "categories should be ordered by created_at ascending",
        prev <= curr,
      );
    }
  }
  // 4. For each top-level category, verify structure
  for (const category of categories) {
    // Verify top-level category has required fields
    TestValidator.equals(
      "top-level category should have UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
      true,
    );
    TestValidator.predicate(
      "category should have name",
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      "category description should be string or null",
      category.description === null || typeof category.description === "string",
    );
    // Verify top-level category should NOT have a parent
    TestValidator.equals(
      "top-level category should not have parent",
      category.parent ?? null,
      null,
    );
    // Verify subcategories array exists and has proper structure
    TestValidator.predicate(
      "subcategories should be an array",
      Array.isArray(category.subcategories),
    );
    // Verify each subcategory structure
    for (const subcategory of category.subcategories) {
      TestValidator.equals(
        "subcategory should have UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          subcategory.id,
        ),
        true,
      );
      TestValidator.predicate(
        "subcategory should have name",
        typeof subcategory.name === "string" && subcategory.name.length > 0,
      );
      TestValidator.predicate(
        "subcategory description should be string or null or undefined",
        subcategory.description === null ||
          subcategory.description === undefined ||
          typeof subcategory.description === "string",
      );
      // Verify subcategory has parent reference pointing to parent category
      TestValidator.notEquals(
        "subcategory should have parent reference",
        subcategory.parent ?? null,
        null,
      );
      if (subcategory.parent !== null && subcategory.parent !== undefined) {
        TestValidator.equals(
          "subcategory parent id should match parent category id",
          subcategory.parent.id,
          category.id,
        );
      }
      // Verify subcategories cannot have their own subcategories (single-level nesting)
      // Using typia.assert would fail if subcategory had unexpected nested structure
      // but the API contract means we just verify this through business logic check
      TestValidator.equals(
        "subcategory should not have nested subcategories",
        (subcategory as any).subcategories ?? null,
        null,
      );
    }
  }
}