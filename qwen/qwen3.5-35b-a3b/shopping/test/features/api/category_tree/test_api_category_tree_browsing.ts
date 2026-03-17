import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_tree_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call the public endpoint without authentication
  const tree: IEcommerceMallCategory.ITree =
    await api.functional.ecommerceMall.categories.tree(connection);
  typia.assert(tree);
  // 2. Validate root category exists with required fields
  TestValidator.predicate(
    "root category has id",
    tree.id !== undefined && tree.id !== null,
  );
  TestValidator.predicate(
    "root category has name",
    tree.name !== undefined && tree.name !== null,
  );
  TestValidator.predicate(
    "root category has slug",
    tree.slug !== undefined && tree.slug !== null,
  );
  TestValidator.predicate(
    "root category has display_order",
    typeof tree.display_order === "number",
  );
  // 3. Validate root category has children array
  TestValidator.predicate(
    "root category has children array",
    Array.isArray(tree.children),
  );
  // 4. Validate at least one root category exists
  TestValidator.predicate(
    "root category children count > 0",
    tree.children.length > 0,
  );
  // 5. Validate each subcategory (children of root)
  for (const subcategory of tree.children) {
    typia.assert(subcategory);
    // Subcategory required fields
    TestValidator.predicate(
      "subcategory has id",
      subcategory.id !== undefined && subcategory.id !== null,
    );
    TestValidator.predicate(
      "subcategory has name",
      subcategory.name !== undefined && subcategory.name !== null,
    );
    TestValidator.predicate(
      "subcategory has slug",
      subcategory.slug !== undefined && subcategory.slug !== null,
    );
    TestValidator.predicate(
      "subcategory has display_order",
      typeof subcategory.display_order === "number",
    );
    // One-level nesting limit: subcategories must have empty children array
    TestValidator.predicate(
      "subcategory has empty children array (one-level nesting limit)",
      Array.isArray(subcategory.children) && subcategory.children.length === 0,
    );
  }
  // 6. Validate root categories are sorted by display_order ASC
  if (tree.children.length > 1) {
    for (let i = 1; i < tree.children.length; i++) {
      const prevOrder = tree.children[i - 1].display_order;
      const currOrder = tree.children[i].display_order;
      TestValidator.predicate(
        "subcategories sorted by display_order ASC",
        currOrder >= prevOrder,
      );
    }
  }
  // 7. Validate display_order is non-negative for all categories
  TestValidator.predicate(
    "root category display_order non-negative",
    tree.display_order >= 0,
  );
  for (const subcategory of tree.children) {
    TestValidator.predicate(
      "subcategory display_order non-negative",
      subcategory.display_order >= 0,
    );
  }
  // 8. Validate UUID format for category IDs using pattern
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "root category id is valid UUID",
    uuidPattern.test(tree.id),
  );
  for (const subcategory of tree.children) {
    TestValidator.predicate(
      "subcategory id is valid UUID",
      uuidPattern.test(subcategory.id),
    );
  }
  // 9. Validate optional fields can be present (description, icon_uri)
  for (const subcategory of tree.children) {
    // description should be string | null | undefined or undefined
    if (subcategory.description !== undefined) {
      TestValidator.predicate(
        "subcategory description is string or null",
        typeof subcategory.description === "string" ||
          subcategory.description === null,
      );
    }
    // icon_uri should be string | null | undefined or undefined
    if (subcategory.icon_uri !== undefined) {
      TestValidator.predicate(
        "subcategory icon_uri is string or null",
        typeof subcategory.icon_uri === "string" ||
          subcategory.icon_uri === null,
      );
    }
  }
  // 10. Validate timestamps are ISO 8601 format if present
  if (tree.created_at !== undefined) {
    TestValidator.predicate(
      "root category created_at is valid date-time",
      !isNaN(Date.parse(tree.created_at)),
    );
  }
  if (tree.updated_at !== undefined) {
    TestValidator.predicate(
      "root category updated_at is valid date-time",
      !isNaN(Date.parse(tree.updated_at)),
    );
  }
  for (const subcategory of tree.children) {
    if (subcategory.created_at !== undefined) {
      TestValidator.predicate(
        "subcategory created_at is valid date-time",
        !isNaN(Date.parse(subcategory.created_at)),
      );
    }
    if (subcategory.updated_at !== undefined) {
      TestValidator.predicate(
        "subcategory updated_at is valid date-time",
        !isNaN(Date.parse(subcategory.updated_at)),
      );
    }
  }
}
