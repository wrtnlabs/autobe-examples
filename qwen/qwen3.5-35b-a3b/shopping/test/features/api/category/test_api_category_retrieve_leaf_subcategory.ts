import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_leaf_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test data for validation
  const leafSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  const parentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve the leaf subcategory (simulated)
  const retrievedCategory = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId: leafSubcategoryId,
    },
  );
  typia.assert(retrievedCategory);
  // 3. Validate leaf subcategory is actually a leaf
  TestValidator.equals(
    "leaf subcategory is_leaf flag should be true",
    retrievedCategory.is_leaf,
    true,
  );
  TestValidator.equals(
    "subcategory_count should be 0 for leaf",
    retrievedCategory.subcategory_count,
    0,
  );
  // 4. Validate parent reference structure when parent exists
  if (retrievedCategory.parent !== null) {
    typia.assert(retrievedCategory.parent);
    TestValidator.equals(
      "parent ID should match",
      retrievedCategory.parent.id,
      parentCategoryId,
    );
    TestValidator.equals(
      "parent name should exist",
      retrievedCategory.parent.name.length > 0,
      true,
    );
    TestValidator.equals(
      "parent isLeaf should be boolean",
      typeof retrievedCategory.parent.isLeaf === "boolean",
      true,
    );
    TestValidator.equals(
      "parent createdAt should be valid date-time",
      retrievedCategory.parent.createdAt.length > 0,
      true,
    );
  }
  // 5. Validate product_count includes all active products
  TestValidator.predicate(
    "product_count should be non-negative",
    retrievedCategory.product_count >= 0,
  );
  TestValidator.equals(
    "product_count type should be int32",
    Number.isInteger(retrievedCategory.product_count),
    true,
  );
  // 6. Validate timestamps are properly formatted date-time strings
  TestValidator.equals(
    "created_at should be valid date-time",
    retrievedCategory.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "updated_at should be valid date-time",
    retrievedCategory.updated_at.length > 0,
    true,
  );
  // 7. Validate soft-delete behavior - deleted_at should be null for active categories
  TestValidator.equals(
    "deleted_at should be null for active category",
    retrievedCategory.deleted_at,
    null,
  );
}
export async function test_api_category_retrieve_leaf_subcategory_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a category that doesn't exist or is soft-deleted
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for non-existent category",
    async () => {
      await api.functional.ecommerceMall.categories.at(connection, {
        categoryId: nonExistentId,
      });
    },
  );
}
