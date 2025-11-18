import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that product detail endpoint returns 404 for non-existent products.
 *
 * Business context: Public product detail pages must respect catalog visibility
 * and soft-delete rules. When a client calls GET
 * /shoppingMall/products/{productId} with a syntactically valid UUID that does
 * not correspond to any visible product (either never existed, deleted, or
 * hidden by catalog rules), the API must not leak any product data and instead
 * respond with a not-found style HTTP error (404 family).
 *
 * This test focuses on the basic non-existent-ID behavior using a random UUID
 * that is not produced by any create call within this test. We do not cover
 * admin delete/unpublish flows here because corresponding SDK endpoints are not
 * provided; instead we just verify that unknown IDs are rejected.
 *
 * Steps:
 *
 * 1. Generate a random syntactically valid UUID for productId via typia.random
 *    with tags.Format<"uuid"> so request validation passes.
 * 2. Call api.functional.shoppingMall.products.at(connection, { productId }) and
 *    expect the backend to reject the request with an HttpError 404, because no
 *    product with that ID should exist.
 * 3. Use TestValidator.httpError to assert that an HttpError with status 404 is
 *    thrown; if the call succeeds and returns IShoppingMallProduct instead, the
 *    test must fail because that would indicate data leakage or missing catalog
 *    visibility enforcement.
 *
 * We intentionally avoid any type mismatch or invalid-UUID tests; this is a
 * pure business-logic validation for non-existent resources.
 */
export async function test_api_product_detail_404_for_nonexistent_product(
  connection: api.IConnection,
) {
  // 1. Generate a syntactically valid but non-existent productId UUID
  const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();

  // 2. Expect 404 when requesting details for the non-existent product
  await TestValidator.httpError(
    "non-existent product detail must return 404",
    404,
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId: nonexistentProductId,
      });
    },
  );
}
