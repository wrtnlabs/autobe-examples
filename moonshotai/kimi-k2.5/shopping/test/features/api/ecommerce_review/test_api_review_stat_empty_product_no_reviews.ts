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

export async function test_api_review_stat_empty_product_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://test.com/join",
      referrer: "https://test.com/home",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Generate random product ID (guarantees no reviews exist)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch review stats for product with no reviews
  const stats =
    await api.functional.ecommerceMall.customer.products.review_stats.reviewStats(
      customerConnection,
      {
        productId,
      },
    );
  typia.assert(stats);
  // 4. Validate empty state values
  TestValidator.equals(
    "averageRating should be 0 for unreviewed product",
    stats.averageRating,
    0,
  );
  TestValidator.equals(
    "totalCount should be 0 for unreviewed product",
    stats.totalCount,
    0,
  );
  TestValidator.equals(
    "distribution[1] should be 0",
    stats.distribution["1"],
    0,
  );
  TestValidator.equals(
    "distribution[2] should be 0",
    stats.distribution["2"],
    0,
  );
  TestValidator.equals(
    "distribution[3] should be 0",
    stats.distribution["3"],
    0,
  );
  TestValidator.equals(
    "distribution[4] should be 0",
    stats.distribution["4"],
    0,
  );
  TestValidator.equals(
    "distribution[5] should be 0",
    stats.distribution["5"],
    0,
  );
}
