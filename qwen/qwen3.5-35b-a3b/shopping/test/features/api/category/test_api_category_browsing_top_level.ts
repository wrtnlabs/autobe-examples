import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browsing_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random UUID for testing (assume category exists in database)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Make GET request to retrieve top-level category
  const category = await api.functional.ecommerceMall.categories.at(
    connection,
    { categoryId },
  );
  typia.assert(category);
  // 3. Validate category is top-level (parent_id is NULL)
  TestValidator.equals("category has no parent", category.parent_id, null);
  // 4. Validate parent field is NULL for top-level category
  TestValidator.equals("parent field is NULL", category.parent, null);
  // 5. Validate category is not soft-deleted
  TestValidator.equals("category not soft-deleted", category.deleted_at, null);
  // 6. Validate required fields are present and correct
  TestValidator.equals("category ID matches request", category.id, categoryId);
  TestValidator.predicate(
    "category name exists",
    category.name !== "" &&
      category.name !== null &&
      category.name !== undefined,
  );
  TestValidator.predicate("created_at is valid", category.created_at !== "");
  TestValidator.predicate("updated_at is valid", category.updated_at !== "");
  // 7. Validate optional description field (may be NULL or string)
  // Already validated by typia.assert on category
  // 8. Validate optional sort_order field (may be NULL or number)
  if (category.sort_order !== undefined && category.sort_order !== null) {
    TestValidator.predicate(
      "sort_order is integer",
      Number.isInteger(category.sort_order),
    );
  }
  // 9. Validate children field structure
  if (category.children !== undefined) {
    TestValidator.predicate(
      "children is array",
      Array.isArray(category.children),
    );
    for (const child of category.children) {
      TestValidator.predicate("child has ID", child.id !== "");
      TestValidator.predicate("child has name", child.name !== "");
      TestValidator.predicate("child has created_at", child.created_at !== "");
      TestValidator.predicate("child has updated_at", child.updated_at !== "");
    }
  }
  // 10. Validate creator field structure (may be NULL if creator deleted)
  if (category.creator !== undefined && category.creator !== null) {
    TestValidator.predicate("creator has ID", category.creator.id !== "");
    TestValidator.predicate("creator has email", category.creator.email !== "");
    TestValidator.predicate(
      "creator has display name",
      category.creator.displayName !== "",
    );
    TestValidator.predicate(
      "creator has banned status",
      typeof category.creator.isBanned === "boolean",
    );
  }
  // 11. Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(category.updated_at)),
  );
}
