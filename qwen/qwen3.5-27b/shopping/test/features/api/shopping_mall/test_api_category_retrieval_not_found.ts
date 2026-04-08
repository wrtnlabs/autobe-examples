import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category retrieval failure scenarios for non-existent categories.
 *
 * Validates that the shopping mall platform properly handles requests for categories that cannot be found. The test ensures appropriate error responses are returned when attempting to retrieve categories with non-existent category IDs. Verifies that error handling is graceful and the system maintains stability when accessing invalid resources.
 *
 * Special attention is given to testing with valid UUID formats that simply don't exist in the database, ensuring the system distinguishes between format validation errors and resource not found errors. The test validates that the API consistently returns errors for any non-existent category regardless of the UUID value.
 *
 * 1. Test retrieval with a valid UUID format that doesn't exist in the database.
 * 2. Verify that 404 Not Found or appropriate error is returned for non-existent categories.
 * 3. Test multiple random UUIDs to ensure consistent error handling behavior.
 * 4. Ensure the endpoint gracefully handles edge cases without exposing internal system details.
 */
export async function test_api_category_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with a valid UUID format that doesn't exist
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should throw error for non-existent category",
    async () =>
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      }),
  );
  // 2. Test with another random valid UUID to ensure consistency
  const anotherNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should consistently throw error for non-existent categories",
    async () =>
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: anotherNonExistentId,
      }),
  );
  // 3. Test with a third random UUID for additional coverage
  const thirdNonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should handle multiple non-existent category requests",
    async () =>
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: thirdNonExistentId,
      }),
  );
}
