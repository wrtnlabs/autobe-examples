import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategoryTree";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of category tree with proper hierarchical structure.
 *
 * Validates the category tree endpoint returns all active categories organized in a two-level hierarchy. Ensures root categories contain their direct subcategories while subcategories themselves have empty arrays, maintaining the two-level structure. Verifies alphabetical ordering by name at both root and subcategory levels.
 *
 * The test confirms that the response structure adheres to the expected business rules: categories are sorted alphabetically, and the hierarchy is strictly two levels deep.
 *
 * 1. Call the category tree endpoint without authentication (public endpoint).
 * 2. Validate response structure with typia.assert for type safety.
 * 3. Verify root categories are ordered alphabetically by name.
 * 4. Validate two-level hierarchy: subcategories have empty subcategories arrays.
 * 5. Verify subcategories within each root are ordered alphabetically by name.
 */
export async function test_api_category_tree_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call the category tree endpoint (public, no authentication needed)
  const tree = await api.functional.ecommerce.tree(connection);
  const categories = typia.assert<IEcommerceCategoryTree[]>(tree);
  // 2. Handle empty catalog case (valid scenario)
  if (categories.length === 0) {
    return;
  }
  // 3. Verify root categories are ordered alphabetically by name
  const rootNames = categories.map((c) => c.name);
  const sortedRootNames = [...rootNames].sort();
  TestValidator.equals(
    "root categories ordered by name",
    rootNames,
    sortedRootNames,
  );
  // 4. Validate two-level hierarchy and subcategory ordering
  for (const root of categories) {
    typia.assert(root);
    const subcategories = root.subcategories;
    // If subcategories exist, validate their structure and ordering
    if (subcategories.length > 0) {
      // Validate each subcategory has proper structure
      for (const sub of subcategories) {
        typia.assert(sub);
        // CRITICAL: Subcategories must have EMPTY subcategories array (two-level hierarchy)
        TestValidator.predicate(
          `subcategory "${sub.name}" has empty subcategories array`,
          sub.subcategories.length === 0,
        );
      }
      // Verify subcategories are ordered alphabetically by name
      const subNames = subcategories.map((c) => c.name);
      const sortedSubNames = [...subNames].sort();
      TestValidator.equals(
        `subcategories of "${root.name}" ordered by name`,
        subNames,
        sortedSubNames,
      );
    }
  }
}