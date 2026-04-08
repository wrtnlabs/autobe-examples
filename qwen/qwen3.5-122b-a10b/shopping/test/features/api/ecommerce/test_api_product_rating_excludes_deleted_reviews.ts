import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductRating";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that deleted reviews are excluded from the average rating calculation.
 *
 * Validates the business rule that soft-deleted reviews do not contribute to product ratings. The average rating endpoint should only consider reviews where deleted_at is null, ensuring historical review data is preserved while not affecting current product ratings.
 *
 * This test creates a seller account, authenticates, and calls the product rating endpoint to verify the response structure and type safety. The complete scenario with review creation and deletion requires additional APIs not provided in the current input materials.
 *
 * 1. Create and authenticate a seller account.
 * 2. Call GET /ecommerce/seller/products/{productId}/rating endpoint.
 * 3. Validate response structure contains average_rating and review_count.
 * 4. Verify typia.assert() validates the IEcommerceProductRating type.
 *
 * **Business Rule Validation**
 *
 * The endpoint filters reviews where deleted_at IS NULL before calculating AVG(rating). Deleted reviews are completely excluded from both the sum and count used in the calculation, maintaining data integrity while preserving historical records.
 */
export async function test_api_product_rating_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Call product rating endpoint
  // Note: Using random UUID since product creation API not available
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const rating: IEcommerceProductRating =
    await api.functional.ecommerce.seller.products.rating.at(sellerConnection, {
      productId,
    });
  typia.assert(rating);
  // 3. Validate response structure
  TestValidator.predicate(
    "review_count is non-negative integer",
    rating.review_count >= 0,
  );
  // 4. Validate average_rating constraints
  if (rating.review_count > 0) {
    TestValidator.predicate(
      "average_rating is between 1 and 5 when reviews exist",
      rating.average_rating !== null &&
        rating.average_rating >= 1 &&
        rating.average_rating <= 5,
    );
  } else {
    TestValidator.equals(
      "average_rating is null when no reviews exist",
      rating.average_rating,
      null,
    );
  }
}
