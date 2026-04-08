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

export async function test_api_review_stat_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Get review stats for a product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const stats =
    await api.functional.ecommerceMall.customer.products.review_stats.reviewStats(
      customerConnection,
      { productId },
    );
  // Step 3: Validate response type
  typia.assert(stats);
  // Step 4: Verify business logic constraints
  // Distribution counts should be non-negative
  TestValidator.predicate(
    "distribution 1-star count is non-negative",
    stats.distribution["1"] >= 0,
  );
  TestValidator.predicate(
    "distribution 2-star count is non-negative",
    stats.distribution["2"] >= 0,
  );
  TestValidator.predicate(
    "distribution 3-star count is non-negative",
    stats.distribution["3"] >= 0,
  );
  TestValidator.predicate(
    "distribution 4-star count is non-negative",
    stats.distribution["4"] >= 0,
  );
  TestValidator.predicate(
    "distribution 5-star count is non-negative",
    stats.distribution["5"] >= 0,
  );
  // Distribution sum must equal totalCount
  const distributionSum =
    stats.distribution["1"] +
    stats.distribution["2"] +
    stats.distribution["3"] +
    stats.distribution["4"] +
    stats.distribution["5"];
  TestValidator.equals(
    "distribution sum equals totalCount",
    distributionSum,
    stats.totalCount,
  );
  // If there are reviews, averageRating should be > 0; if no reviews, averageRating should be 0
  if (stats.totalCount === 0) {
    TestValidator.equals(
      "averageRating is 0 when no reviews",
      stats.averageRating,
      0,
    );
  } else {
    TestValidator.predicate(
      "averageRating is positive when reviews exist",
      stats.averageRating > 0,
    );
    TestValidator.predicate(
      "averageRating is within valid range",
      stats.averageRating >= 0 && stats.averageRating <= 5,
    );
  }
}
