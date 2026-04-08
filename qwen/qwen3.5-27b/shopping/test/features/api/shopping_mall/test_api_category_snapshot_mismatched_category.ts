import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of category snapshot with mismatched category ID and snapshot ID returns 404.
 *
 * Validates that the category snapshot retrieval endpoint properly enforces dual filtering by both category ID and snapshot ID. When a snapshot ID is provided that does not belong to the specified category ID, the system should return a 404 Not Found error. This ensures snapshots cannot be accessed cross-category and maintains proper data isolation.
 *
 * 1. Generate random UUIDs for category ID and snapshot ID
 * 2. Call GET /shoppingMall/categories/{categoryId}/snapshots/{snapshotId} with mismatched IDs
 * 3. Verify the response returns 404 Not Found status
 */
export async function test_api_category_snapshot_mismatched_category(
  connection: api.IConnection,
): Promise<void> {
  // Create public connection for unauthenticated endpoint access
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate random UUIDs for testing mismatched scenario
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Validate that mismatched category and snapshot IDs return 404
  await TestValidator.httpError(
    "mismatched category and snapshot IDs should return 404",
    404,
    async () =>
      await api.functional.shoppingMall.categories.snapshots.at(
        publicConnection,
        {
          categoryId,
          snapshotId,
        },
      ),
  );
}
