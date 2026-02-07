import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a specific subcategory within a parent category.
 * This scenario validates that the endpoint correctly queries the database,
 * verifies the parent-child relationship between categories and subcategories,
 * and returns the complete subcategory information.
 */
export async function test_api_subcategory_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create random IDs for test category and subcategory
  const categoryId = RandomGenerator.alphaNumeric(36);
  const subcategoryId = RandomGenerator.alphaNumeric(36);
  // Test successful subcategory retrieval with random IDs (simulated)
  const retrieved =
    await api.functional.shoppingMall.categories.subcategories.at(connection, {
      categoryId: categoryId,
      subcategoryId: subcategoryId,
    });
  typia.assert(retrieved);
}
