import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate that public category detail retrieval returns an error for
 * non-existent categories without requiring authentication.
 *
 * Business expectations (adapted to framework constraints):
 *
 * - GET /shoppingMall/categories/{categoryId} is a public endpoint and must not
 *   require any authentication headers.
 * - When a client requests a categoryId that does not exist, the backend must
 *   respond with an HTTP-level failure represented by an error (HttpError in
 *   the SDK) rather than returning a valid IShoppingMallCategory.
 * - This test focuses on the negative path only; success-path tests are handled
 *   elsewhere.
 *
 * Test flow:
 *
 * 1. Generate a syntactically valid UUID string to act as a non-existent
 *    categoryId using typia.random<string & tags.Format<"uuid">>().
 * 2. Without performing any authentication or touching connection.headers, call
 *    api.functional.shoppingMall.categories.at with the random categoryId.
 * 3. Use TestValidator.error to assert that the call results in an error, proving
 *    that the server treats unknown category IDs as failure cases.
 */
export async function test_api_public_category_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random syntactically valid UUID to represent a non-existent category ID
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Call the public category detail endpoint without any authentication and
  //    assert that an error is thrown for the non-existent category.
  await TestValidator.error(
    "requesting non-existent category should result in error",
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: nonexistentCategoryId,
      });
    },
  );
}
