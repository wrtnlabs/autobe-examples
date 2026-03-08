import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_get_empty_products(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection in simulation mode to test with mock data
  const testConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };
  // Generate random category ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Call GET endpoint for the category
  const retrievedCategory = await api.functional.ecommerceMall.categories.at(
    testConnection,
    {
      categoryId,
    },
  );
  typia.assert(retrievedCategory);
  // Validate is_leaf flag - empty categories should have is_leaf: true
  TestValidator.equals(
    "category is_leaf flag",
    retrievedCategory.is_leaf,
    true,
  );
  // Validate all standard fields are present
  TestValidator.predicate("category id is valid uuid", () => {
    try {
      typia.assert(retrievedCategory.id);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("category name has valid length", () => {
    const minLen = retrievedCategory.name.length >= 1;
    const maxLen = retrievedCategory.name.length <= 500;
    return minLen && maxLen;
  });
  // Validate description can be null or string
  if (retrievedCategory.description !== null) {
    TestValidator.predicate(
      "description is valid string",
      () => typeof retrievedCategory.description === "string",
    );
  }
  // Validate timestamps are valid date-time format
  TestValidator.predicate("created_at is valid date-time", () => {
    try {
      new Date(retrievedCategory.created_at);
      return !isNaN(Date.parse(retrievedCategory.created_at));
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    try {
      new Date(retrievedCategory.updated_at);
      return !isNaN(Date.parse(retrievedCategory.updated_at));
    } catch {
      return false;
    }
  });
  // Validate deleted_at is null (active category) or valid date-time if not null
  if (retrievedCategory.deleted_at !== null) {
    TestValidator.predicate("deleted_at is valid date-time", () => {
      try {
        const deleted_at = (retrievedCategory.deleted_at ?? "") as string;
        new Date(deleted_at);
        return !isNaN(Date.parse(deleted_at));
      } catch {
        return false;
      }
    });
  }
  // Validate parent field structure
  if (
    retrievedCategory.parent !== null &&
    retrievedCategory.parent !== undefined
  ) {
    const parent = retrievedCategory.parent;
    TestValidator.equals(
      "parent is_leaf flag",
      parent.is_leaf,
      true,
    );
    TestValidator.predicate("parent has valid id", () => {
      try {
        typia.assert(parent.id);
        return true;
      } catch {
        return false;
      }
    });
  }
}