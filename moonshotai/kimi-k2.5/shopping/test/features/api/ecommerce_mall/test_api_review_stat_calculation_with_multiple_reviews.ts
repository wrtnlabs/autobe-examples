import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_stat_calculation_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<20>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Request review stats for a product with known review distribution
  // This test assumes the test environment has a product with reviews having ratings: 1, 3, 3, 4, 5
  // Total stars = 1 + 3 + 3 + 4 + 5 = 16, Count = 5, Average = 3.2
  const productId = typia.random<string & tags.Format<"uuid">>();
  const stats =
    await api.functional.ecommerceMall.customer.products.review_stats.reviewStats(
      customerConnection,
      { productId },
    );
  typia.assert(stats);
  // 3. Validate statistical calculations
  // Average rating should be 3.2 (16/5 rounded to 1 decimal)
  TestValidator.equals("average rating calculation", stats.averageRating, 3.2);
  // Total count should be 5 reviews
  TestValidator.equals("total review count", stats.totalCount, 5);
  // Distribution validation: 1 at rating 1, 0 at rating 2, 2 at rating 3, 1 at rating 4, 1 at rating 5
  TestValidator.equals("distribution rating 1", stats.distribution["1"], 1);
  TestValidator.equals("distribution rating 2", stats.distribution["2"], 0);
  TestValidator.equals("distribution rating 3", stats.distribution["3"], 2);
  TestValidator.equals("distribution rating 4", stats.distribution["4"], 1);
  TestValidator.equals("distribution rating 5", stats.distribution["5"], 1);
}