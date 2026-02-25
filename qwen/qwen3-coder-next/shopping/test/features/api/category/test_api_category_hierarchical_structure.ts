import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_hierarchical_structure(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve categories from API
  const response = await api.functional.shoppingMall.categories.at(connection);
  typia.assert(response);
  // Verify pagination structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.predicate("has records", response.pagination.records > 0);
  TestValidator.predicate("has pages", response.pagination.pages > 0);
  // Verify each category has hierarchical structure
  const rootCategories: IShoppingMallCategory.ISummary[] = [];
  for (const category of response.data) {
    // Verify required fields exist
    TestValidator.equals("category has id", typeof category.id, "string");
    TestValidator.equals("category has name", typeof category.name, "string");
    TestValidator.equals(
      "category has description",
      typeof category.description,
      "string",
    );
    // Verify parent relationship
    if (category.parent === null) {
      // Root category
      rootCategories.push(category);
      TestValidator.equals(
        "root category parent is null",
        category.parent,
        null,
      );
    } else {
      // Subcategory
      TestValidator.equals(
        "subcategory has parent id",
        typeof category.parent.id,
        "string",
      );
      TestValidator.equals(
        "subcategory has parent name",
        typeof category.parent.name,
        "string",
      );
    }
    // Verify subcategory count
    TestValidator.equals(
      "subcategory_count is number",
      typeof category.subcategory_count,
      "number",
    );
    TestValidator.predicate(
      "subcategory_count >= 0",
      category.subcategory_count >= 0,
    );
  }
  // Verify at least one root category exists
  TestValidator.predicate("has root categories", rootCategories.length > 0);
}
