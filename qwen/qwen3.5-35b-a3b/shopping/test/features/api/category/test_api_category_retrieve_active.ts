import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection for public endpoint
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for category ID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the active category
  const category = await api.functional.ecommerceMall.categories.at(
    publicConnection,
    {
      categoryId,
    },
  );
  typia.assert(category);
  // Validate business logic
  TestValidator.equals("category is active", category.is_active, true);
  TestValidator.predicate(
    "display order is positive",
    category.display_order > 0,
  );
  // Validate name and slug are non-empty strings
  TestValidator.predicate(
    "category name is non-empty",
    category.name.length > 0,
  );
  TestValidator.predicate(
    "category slug is non-empty",
    category.slug.length > 0,
  );
  // Validate timestamps are in reasonable range (created before or at updated)
  TestValidator.predicate(
    "created_at before or equal to updated_at",
    new Date(category.created_at) <= new Date(category.updated_at),
  );
  // Validate optional fields are either present or null/undefined
  TestValidator.predicate(
    "description is valid when present",
    category.description === null ||
      typeof category.description === "string" ||
      category.description === undefined,
  );
  TestValidator.predicate(
    "icon_uri is valid when present",
    category.icon_uri === null ||
      typeof category.icon_uri === "string" ||
      category.icon_uri === undefined,
  );
  TestValidator.predicate(
    "parent is valid when present",
    category.parent === null ||
      category.parent === undefined ||
      (typeof category.parent === "object" && category.parent !== null),
  );
  TestValidator.predicate(
    "deleted_at is valid when present",
    category.deleted_at === null || !isNaN(Date.parse(category.deleted_at)),
  );
}
