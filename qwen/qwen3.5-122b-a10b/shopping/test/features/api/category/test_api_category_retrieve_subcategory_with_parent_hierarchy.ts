import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_subcategory_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random category with potential parent hierarchy
  const subcategory: IEcommerceMallCategory =
    typia.random<IEcommerceMallCategory>();
  // Ensure we have a subcategory (has parent)
  const categoryId: string & tags.Format<"uuid"> = subcategory.parent_id
    ? subcategory.parent_id
    : subcategory.id;
  // Retrieve the category by ID
  const output: IEcommerceMallCategory =
    await api.functional.ecommerceMall.categories.at(connection, {
      categoryId,
    });
  typia.assert(output);
  // Validate the response structure
  TestValidator.equals("category ID matches", output.id, categoryId);
  // Validate parent hierarchy exists for subcategories
  if (output.parent_id !== null) {
    TestValidator.predicate(
      "parent_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        output.parent_id,
      ),
    );
    // Validate parent summary structure
    TestValidator.predicate("parent exists", output.parent !== null);
    if (output.parent !== null) {
      TestValidator.equals(
        "parent ID matches parent_id",
        output.parent.id,
        output.parent_id,
      );
      TestValidator.predicate("parent has name", output.parent.name.length > 0);
      TestValidator.predicate(
        "parent has created_at",
        output.parent.created_at.length > 0,
      );
      TestValidator.predicate(
        "parent deleted_at is null or valid",
        output.parent.deleted_at === null ||
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
            output.parent.deleted_at,
          ),
      );
    }
  }
  // Validate subcategories array exists
  TestValidator.predicate(
    "subcategories is array",
    Array.isArray(output.subcategories),
  );
  // Validate all subcategories in the array have correct summary structure
  for (const subcat of output.subcategories) {
    typia.assert(subcat);
    TestValidator.predicate("subcategory has valid ID", subcat.id.length > 0);
    TestValidator.predicate("subcategory has name", subcat.name.length > 0);
    TestValidator.predicate(
      "subcategory has created_at",
      subcat.created_at.length > 0,
    );
  }
}
