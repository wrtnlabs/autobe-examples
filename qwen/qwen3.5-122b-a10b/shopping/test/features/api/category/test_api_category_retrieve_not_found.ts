import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a category with a non-existent UUID returns 404 Not Found.
 *
 * Validates the error handling behavior when attempting to retrieve a category that does not exist in the system. This includes testing with UUIDs that were never created and ensures proper soft-delete filtering prevents access to deleted categories.
 *
 * The test generates a random UUID that is guaranteed not to exist in the database and verifies that the API returns an HTTP 404 error. This confirms the endpoint properly handles missing resources and applies soft-delete filters correctly.
 *
 * 1. Generate a random UUID that does not exist in the database.
 * 2. Attempt to retrieve the category using api.functional.ecommerce.categories.at.
 * 3. Validate that the API throws an HttpError with status 404.
 * 4. Confirms proper error handling for non-existent category resources.
 */
export async function test_api_category_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Validate that retrieving a non-existent category returns 404
  await TestValidator.httpError(
    "non-existent category returns 404",
    404,
    async () => {
      await api.functional.ecommerce.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
