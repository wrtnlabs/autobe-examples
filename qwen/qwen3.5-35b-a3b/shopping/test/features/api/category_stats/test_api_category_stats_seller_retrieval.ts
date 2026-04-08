import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_category_stats_seller_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with randomized credentials
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  // 2. Authenticate seller and get access token
  const sellerAuth = await authorize_seller_join(connection, {
    body: joinData,
  });
  typia.assert(sellerAuth);
  // 3. Create seller-specific connection for authenticated requests
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 4. Generate a valid category ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Request category statistics from authenticated seller
  const stats = await api.functional.ecommerceMall.seller.categories.stats(
    sellerConnection,
    { categoryId },
  );
  typia.assert(stats);
  // 6. Validate response contains all required fields with correct structure
  TestValidator.predicate(
    "stats has non-negative product counts",
    stats.totalProductsCount >= 0 && stats.activeProductCount >= 0,
  );
  TestValidator.predicate(
    "stats has non-negative order counts",
    stats.totalOrderCount >= 0 && stats.uniqueCustomerCount >= 0,
  );
  TestValidator.predicate(
    "stats has valid last updated timestamp",
    stats.lastUpdated !== undefined,
  );
  // 7. Validate average rating constraints if not null
  if (stats.averageRating !== null) {
    TestValidator.predicate(
      "average rating is within valid range",
      stats.averageRating >= 1.0 && stats.averageRating <= 5.0,
    );
  }
}
