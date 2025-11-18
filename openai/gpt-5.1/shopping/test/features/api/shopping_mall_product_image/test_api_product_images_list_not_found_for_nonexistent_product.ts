import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

export async function test_api_product_images_list_not_found_for_nonexistent_product(
  connection: api.IConnection,
) {
  /**
   * Validate that requesting product images for a non-existent product results
   * in a 404 Not Found-style HTTP error instead of returning a normal paginated
   * list (even if empty).
   *
   * Business intent:
   *
   * - Callers must be able to distinguish between:
   *
   *   - A real product that simply has zero images, and
   *   - A productId that does not correspond to any existing product.
   * - For the latter, the platform should treat it as a resource-not-found
   *   condition and surface an HTTP 404 error.
   *
   * Steps:
   *
   * 1. Generate a random UUID to act as a non-existent productId.
   * 2. Build a valid IShoppingMallProductImage.IRequest body using typia.random.
   * 3. From an unauthenticated client (no auth steps performed), invoke
   *    api.functional.shoppingMall.products.images.index with the random
   *    productId and request body.
   * 4. Assert that the call fails with a 404 HTTP error using
   *    TestValidator.httpError.
   */
  const nonexistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestBody = typia.random<IShoppingMallProductImage.IRequest>();

  await TestValidator.httpError(
    "listing images for nonexistent product should yield 404",
    404,
    async () => {
      await api.functional.shoppingMall.products.images.index(connection, {
        productId: nonexistentProductId,
        body: requestBody,
      });
    },
  );
}
