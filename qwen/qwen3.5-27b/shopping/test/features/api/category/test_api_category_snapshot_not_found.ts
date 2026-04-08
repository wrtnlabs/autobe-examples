import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a non-existent category snapshot returns 404.
 *
 * Validates that attempting to retrieve a category snapshot with a valid category ID but non-existent snapshot ID properly returns a 404 Not Found error. This ensures the API correctly handles missing snapshot references and doesn't expose internal errors or return invalid data.
 *
 * The test verifies proper error handling for the category snapshot retrieval endpoint when the requested snapshot doesn't exist in the system.
 *
 * 1. Generate a valid category ID UUID for the request
 * 2. Generate a random snapshot ID UUID that doesn't exist in the database
 * 3. Attempt to retrieve the non-existent snapshot via API call
 * 4. Validate that the API throws an HTTP error with status code 404
 */
export async function test_api_category_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate valid category ID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Generate non-existent snapshot ID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent snapshot and validate 404 error
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.categories.snapshots.at(connection, {
        categoryId,
        snapshotId,
      }),
  );
}
