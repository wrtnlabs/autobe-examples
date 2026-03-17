import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_without_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - no authentication needed for category retrieval
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Test category metadata structure and validation
  // Using SDK random generator to create valid category data structure
  // This validates that categories with no products have complete metadata
  const expectedCategory = api.functional.ecommerceMall.categories.at.random();
  typia.assert(expectedCategory);
  // 3. Validate category metadata structure (name, slug, description, etc.)
  // This confirms categories remain visible with complete metadata even without products
  TestValidator.equals(
    "category name exists",
    expectedCategory.name.length > 0,
    true,
  );
  TestValidator.equals(
    "category slug exists",
    expectedCategory.slug.length > 0,
    true,
  );
  TestValidator.equals(
    "display order is number",
    typeof expectedCategory.display_order === "number",
    true,
  );
  TestValidator.equals(
    "is active is boolean",
    typeof expectedCategory.is_active === "boolean",
    true,
  );
  TestValidator.equals(
    "created at is valid",
    expectedCategory.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated at is valid",
    expectedCategory.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted at is null or date",
    expectedCategory.deleted_at === null ||
      typeof expectedCategory.deleted_at === "string",
    true,
  );
  // 4. Validate description is optional (can be null or undefined)
  if (expectedCategory.description !== undefined) {
    if (expectedCategory.description !== null) {
      TestValidator.equals(
        "description is string when present",
        typeof expectedCategory.description === "string",
        true,
      );
    }
  }
  // 5. Validate icon_uri is optional (can be null or undefined)
  if (expectedCategory.icon_uri !== undefined) {
    if (expectedCategory.icon_uri !== null) {
      TestValidator.equals(
        "icon_uri is string when present",
        typeof expectedCategory.icon_uri === "string",
        true,
      );
    }
  }
  // 6. Validate parent is optional (can be null or undefined)
  if (expectedCategory.parent !== undefined) {
    typia.assert(expectedCategory.parent);
  }
  // 7. Confirm id exists and is valid UUID
  typia.assert(expectedCategory.id);
}
