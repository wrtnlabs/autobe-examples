import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent category returns 404.
 *
 * Verifies that when a categoryId with valid UUID format but no matching
 * record is provided, the API returns 404 Not Found. This ensures browsing
 * integrity by not exposing internal data gaps to users.
 *
 * Scenario:
 * 1. Generate a random UUID (valid format) that doesn't exist in the database
 * 2. Attempt to retrieve the category by this non-existent ID
 * 3. Verify that 404 Not Found error is returned
 */
export async function test_api_category_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID format that doesn't exist in the database
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent category
  // Expect 404 Not Found error
  await TestValidator.httpError("non-existent category returns 404", 404, () =>
    api.functional.ecommerceMall.categories.at(connection, {
      categoryId: nonExistentCategoryId,
    }),
  );
}
