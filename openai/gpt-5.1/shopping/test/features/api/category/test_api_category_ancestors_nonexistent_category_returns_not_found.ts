import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Verify that requesting ancestors for a non-existent category returns 404.
 *
 * Business context: The ancestors endpoint exposes the hierarchy path for an
 * existing shopping mall category. When clients accidentally or maliciously
 * request ancestors for a categoryId that does not correspond to any visible
 * category, the backend must respond with a not-found HTTP error instead of
 * returning random or empty ancestor data.
 *
 * This test ensures that behavior by calling the ancestors endpoint with a
 * random categoryId that is extremely unlikely to exist and asserting that the
 * SDK surfaces a 404 HttpError.
 *
 * Steps:
 *
 * 1. Generate a random UUID-like string value to serve as a bogus categoryId.
 *    Using typia.random<string & tags.Format<"uuid">>() ensures the value is
 *    syntactically valid but not tied to a real record in the test database.
 * 2. Invoke api.functional.shoppingMall.categories.ancestors.index with that
 *    categoryId using the provided connection.
 * 3. Wrap the call in TestValidator.httpError with an expected 404 status so that
 *    the test passes only when the server treats the category as not found.
 * 4. Do not perform any additional checks on the error payload or headers; we only
 *    care that the not-found status is emitted.
 *
 * No authentication is required, as the endpoint is documented as public and
 * the SDK connection is assumed to be configured.
 */
export async function test_api_category_ancestors_nonexistent_category_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID-like categoryId that should not exist.
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2-3. Call the ancestors endpoint and assert that it fails with 404.
  await TestValidator.httpError(
    "ancestors of non-existent category should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.categories.ancestors.index(connection, {
        categoryId: nonexistentCategoryId,
      });
    },
  );
}
