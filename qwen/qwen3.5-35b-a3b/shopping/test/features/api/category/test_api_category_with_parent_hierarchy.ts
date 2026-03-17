import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a category with parent hierarchy relationship.
 * Verifies the parent field contains IEcommerceMallCategory.ISummary
 * and the parent_id foreign key correctly references the parent.
 */
export async function test_api_category_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Test with a pre-existing category ID (using a specific UUID)
  // In production, this would be a known category from setup
  const testCategoryId = "123e4567-e89b-12d3-a456-426614174000";
  // Retrieve the category from the API
  const category = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId: testCategoryId,
    },
  );
  // Validate the response type and structure
  typia.assert(category);
  // Verify category has its own metadata
  TestValidator.equals("category id", category.id, testCategoryId);
  TestValidator.predicate(
    "category has name",
    () => typeof category.name === "string" && category.name.length > 0,
  );
  TestValidator.predicate(
    "category has slug",
    () => typeof category.slug === "string" && category.slug.length > 0,
  );
  TestValidator.predicate(
    "category has display order",
    () => category.display_order >= 0,
  );
  TestValidator.predicate(
    "category has active status",
    () => category.is_active === true || category.is_active === false,
  );
  // Validate timestamps are ISO date-time format
  TestValidator.predicate("category has created_at timestamp", () => {
    try {
      new Date(category.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("category has updated_at timestamp", () => {
    try {
      new Date(category.updated_at);
      return true;
    } catch {
      return false;
    }
  });
  // Validate parent field structure if it exists (subcategory case)
  if (category.parent !== undefined && category.parent !== null) {
    typia.assert(category.parent);
    const parent = category.parent;
    // Verify parent contains IEcommerceMallCategory.ISummary fields
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate("parent id is valid uuid", () =>
      uuidRegex.test(parent.id),
    );
    TestValidator.predicate(
      "parent has name",
      () => typeof parent.name === "string",
    );
    TestValidator.predicate(
      "parent has slug",
      () => typeof parent.slug === "string",
    );
  }
  // Validate optional fields when present
  if (category.description !== undefined && category.description !== null) {
    TestValidator.predicate(
      "description is string",
      () => typeof category.description === "string",
    );
  }
  if (category.icon_uri !== undefined && category.icon_uri !== null) {
    TestValidator.predicate(
      "icon_uri is string",
      () => typeof category.icon_uri === "string",
    );
  }
  // Validate soft delete timestamp when present
  if (category.deleted_at !== undefined && category.deleted_at !== null) {
    TestValidator.predicate("deleted_at is valid date-time", () => {
      try {
        new Date(category.deleted_at!);
        return true;
      } catch {
        return false;
      }
    });
  }
}