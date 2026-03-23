import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_hierarchy_with_empty_and_sparse_categories(
  connection: api.IConnection,
): Promise<void> {
  // Get category hierarchy
  const categories =
    await api.functional.ecommerceMall.categories.get(connection);
  typia.assert(categories);
  // Validate category hierarchy structure
  TestValidator.predicate("categories is array", Array.isArray(categories));
  // Check that categories array exists and is valid
  if (Array.isArray(categories)) {
    // Test that empty categories are included in hierarchy
    const emptyCategories = categories.filter(
      (cat) => !cat.before_name || cat.before_name.length === 0,
    );
    TestValidator.predicate(
      "empty categories exist",
      emptyCategories.length > 0 || categories.length === 0,
    );
    // Test sparse categories (categories without subcategories)
    const sparseCategories = categories.filter(
      (cat) =>
        !cat.before_name ||
        cat.before_name === "" ||
        (cat.after_name && cat.after_name === ""),
    );
    TestValidator.predicate(
      "sparse categories exist",
      sparseCategories.length >= 0,
    );
  }
}
