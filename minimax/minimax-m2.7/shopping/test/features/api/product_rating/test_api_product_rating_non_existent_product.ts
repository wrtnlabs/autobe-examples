import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving the rating statistics for a product that does not exist in the system.
 *
 * Validates that the product rating endpoint properly handles requests for non-existent products by returning an appropriate HTTP 404 error. This ensures that the API correctly validates product existence before attempting to calculate any ratings.
 *
 * The test generates a random UUID that is guaranteed not to correspond to any existing product, then attempts to retrieve rating statistics for this non-existent product. The expected behavior is a 404 Not Found response with a message indicating the product was not found.
 *
 * 1. Generate a random UUID that does not correspond to any existing product.
 * 2. Call GET /ecommerceMall/products/{nonExistentProductId}/rating.
 * 3. Verify response returns HTTP 404 status code.
 * 4. Verify error message indicates "Product not found".
 */
export async function test_api_product_rating_non_existent_product(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing product
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve rating for non-existent product - expect 404 error
  await TestValidator.httpError(
    "non-existent product returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.products.rating.at(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
