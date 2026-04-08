import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Verifies that requesting reviews for a missing product returns a not-found error.
 *
 * This test exercises the review endpoint's route-level product resolution and ensures the API does not fall through to an empty review page when the referenced product does not exist.
 *
 * 1. Calls the product review endpoint with a random UUID that should not match an existing product.
 * 2. Sends a valid paging request body so the failure is attributable to the missing product, not request shape.
 * 3. Confirms the endpoint responds with a not-found HTTP error.
 */
export async function test_api_product_reviews_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "missing product reviews should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.products.reviews.index(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformReview.IRequest,
      });
    },
  );
}
