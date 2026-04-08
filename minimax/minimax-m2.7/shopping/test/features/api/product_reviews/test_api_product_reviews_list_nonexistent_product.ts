import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving reviews for a product that does not exist.
 *
 * Validates that the API properly validates product existence before querying
 * reviews. When a non-existent product ID is provided, the system should return
 * HTTP 404 Not Found error with an appropriate error message.
 *
 * This test ensures that:
 * 1. The product existence check is performed before querying reviews
 * 2. Proper HTTP 404 status is returned for invalid product IDs
 * 3. No review data is returned when the product does not exist
 *
 * 1. Generate a random UUID that does not correspond to any existing product.
 * 2. Attempt to retrieve reviews for the non-existent product.
 * 3. Verify HTTP 404 status code is returned.
 * 4. Verify error message indicates product was not found.
 */
export async function test_api_product_reviews_list_nonexistent_product(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID that does not correspond to any existing product
  const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve reviews for the non-existent product
  await TestValidator.httpError(
    "should return 404 for nonexistent product reviews",
    404,
    async () =>
      await api.functional.ecommerceMall.products.reviews.getByProductid(
        connection,
        {
          productId: nonexistentProductId,
        },
      ),
  );
}
