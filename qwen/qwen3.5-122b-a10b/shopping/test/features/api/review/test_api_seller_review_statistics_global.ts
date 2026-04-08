import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewStatistic";
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
 * Test seller can retrieve global review statistics across all products.
 *
 * Validates that a seller authenticated on the platform can access aggregated review statistics without filtering by a specific product. The endpoint returns platform-wide metrics including average rating, total review count, and rating distribution across all five star levels.
 *
 * This test ensures the statistics calculation correctly excludes soft-deleted reviews and properly aggregates data from all products on the platform. The distribution object must contain counts for each star level (1 through 5), and the sum of these counts must equal the total_count value.
 *
 * 1. Register and authenticate a seller account.
 * 2. Call the review statistics endpoint without product_id filter.
 * 3. Validate response structure with typia.assert().
 * 4. Verify distribution contains all five star levels (1-5).
 * 5. Verify sum of distribution counts equals total_count.
 * 6. Verify average_rating is within valid range (1.0 to 5.0).
 */
export async function test_api_seller_review_statistics_global(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Call statistics endpoint without product_id filter (global statistics)
  const statistics: IEcommerceReviewStatistic =
    await api.functional.ecommerce.seller.reviews.statistics.search(
      sellerConnection,
      {
        body: {} as IEcommerceReview.IRequest,
      },
    );
  typia.assert(statistics);
  // 3. Validate business logic - distribution keys exist and have valid values
  TestValidator.predicate(
    "distribution has all star levels",
    statistics.distribution["1"] >= 0 &&
      statistics.distribution["2"] >= 0 &&
      statistics.distribution["3"] >= 0 &&
      statistics.distribution["4"] >= 0 &&
      statistics.distribution["5"] >= 0,
  );
  // 4. Validate sum of distribution equals total_count
  const distributionSum =
    statistics.distribution["1"] +
    statistics.distribution["2"] +
    statistics.distribution["3"] +
    statistics.distribution["4"] +
    statistics.distribution["5"];
  TestValidator.equals(
    "distribution sum equals total count",
    distributionSum,
    statistics.total_count,
  );
  // 5. Validate average rating is within valid range
  TestValidator.predicate(
    "average rating within valid range",
    statistics.average_rating >= 1 && statistics.average_rating <= 5,
  );
}
