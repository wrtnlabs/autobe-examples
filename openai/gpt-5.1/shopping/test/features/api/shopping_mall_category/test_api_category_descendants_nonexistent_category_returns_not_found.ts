import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_category_descendants_nonexistent_category_returns_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate that requesting descendants for a non-existent category results in
   * a not-found HTTP error.
   *
   * Business rationale:
   *
   * - The descendants endpoint must distinguish between an existing category with
   *   zero descendants (which should return 200 and an empty list) and a
   *   non-existent or soft-deleted category (which must return a not-found
   *   error).
   * - Clients rely on this distinction to decide whether they should show an
   *   empty tree or report a broken link / missing resource.
   *
   * Test steps:
   *
   * 1. Generate a random UUID that is extremely unlikely to correspond to any real
   *    category.
   * 2. Call GET /shoppingMall/categories/{categoryId}/descendants using the SDK.
   * 3. Assert that the SDK throws an HttpError with 404 status via
   *    TestValidator.httpError.
   */

  // 1. Prepare a random UUID for a non-existent category.
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2-3. Call the descendants API and verify that it responds with a 404 not-found error.
  await TestValidator.httpError(
    "requesting descendants of a non-existent category must return 404 not found",
    404,
    async () => {
      await api.functional.shoppingMall.categories.descendants.index(
        connection,
        {
          categoryId: nonexistentCategoryId,
        },
      );
    },
  );
}
