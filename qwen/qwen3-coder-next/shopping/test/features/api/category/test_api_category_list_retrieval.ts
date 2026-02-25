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

export async function test_api_category_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const output = await api.functional.shoppingMall.categories.at(connection);
  typia.assert(output);
  // Validate pagination structure
  TestValidator.equals("pagination exists", typeof output.pagination, "object");
  TestValidator.predicate(
    "has positive page count",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "has positive record count",
    output.pagination.records >= 0,
  );
  // Validate category list structure
  TestValidator.predicate("has category data", Array.isArray(output.data));
  TestValidator.equals(
    "data count matches pagination",
    output.data.length,
    output.pagination.records,
  );
  // Validate each category summary
  for (const category of output.data) {
    typia.assert(category);
    TestValidator.equals("has valid UUID", typeof category.id, "string");
    TestValidator.equals("has name", typeof category.name, "string");
    TestValidator.predicate("name is not empty", category.name.length > 0);
    TestValidator.predicate(
      "description is string or null",
      ["string", "null"].includes(typeof category.description),
    );
    TestValidator.predicate(
      "has valid parent reference",
      ["object", "null"].includes(typeof category.parent),
    );
    TestValidator.predicate(
      "has non-negative subcategory count",
      category.subcategory_count >= 0,
    );
  }
}