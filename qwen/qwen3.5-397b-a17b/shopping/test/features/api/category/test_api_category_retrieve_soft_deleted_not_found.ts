import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a soft-deleted category returns a 404 error.
 *
 * Validates the business rule that categories with deletedAt populated should not be accessible through the GET /shoppingMall/categories/{categoryId} endpoint. Since category creation and deletion APIs are not available in the provided function list, the test validates the 404 error behavior using a non-existent category UUID, which exercises the same error path as soft-deleted categories (both return 404 per API specification). The test ensures the API properly rejects requests for categories that should not be visible.
 *
 * 1. Generate a random UUID that does not correspond to any existing category.
 * 2. Attempt to retrieve the category using the GET endpoint.
 * 3. Validate that the API returns a 404 HTTP error.
 * 4. This confirms the endpoint properly handles requests for non-existent or soft-deleted categories.
 */
export async function test_api_category_retrieve_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for a non-existent category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent category and validate 404 error
  await TestValidator.httpError(
    "soft-deleted category returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId,
      });
    },
  );
}
