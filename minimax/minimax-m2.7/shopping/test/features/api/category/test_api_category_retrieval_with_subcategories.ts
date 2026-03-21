import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieval_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the category ID to test retrieval
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the category with subcategories
  const category = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId,
    },
  );
  // Assert the response conforms to IEcommerceMallCategory.IInvert type
  typia.assert(category);
  // Validate that it's a top-level category (parent should be null for root)
  TestValidator.equals(
    "parent should be null for top-level category",
    category.parent,
    null,
  );
  // Validate subcategories array exists and is an array
  TestValidator.predicate(
    "subcategories should be an array",
    Array.isArray(category.subcategories),
  );
  // Validate subcategories structure if any exist
  for (const subcategory of category.subcategories) {
    // Validate subcategory has required summary fields
    TestValidator.predicate(
      "subcategory has valid id",
      (subcategory.id?.length ?? 0) > 0,
    );
    TestValidator.predicate(
      "subcategory has valid name",
      (subcategory.name?.length ?? 0) > 0,
    );
    // Validate subcategory's parent reference points back to parent category
    if (subcategory.parent !== undefined && subcategory.parent !== null) {
      TestValidator.equals(
        "subcategory parent id matches parent category id",
        subcategory.parent.id,
        category.id,
      );
    }
  }
  // Validate timestamps are properly formatted date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.updated_at),
  );
  // Validate the parent category has id, name, and description (all optional except id and name)
  TestValidator.predicate(
    "category has valid id",
    (category.id?.length ?? 0) > 0,
  );
  TestValidator.predicate(
    "category has valid name",
    (category.name?.length ?? 0) > 0,
  );
}
