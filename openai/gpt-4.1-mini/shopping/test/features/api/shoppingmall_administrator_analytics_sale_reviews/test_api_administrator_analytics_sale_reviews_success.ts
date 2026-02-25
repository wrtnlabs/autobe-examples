import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSaleReviewsAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewsAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sale_reviews_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins (registers) account successfully
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Admin sends GET request to /shoppingMall/administrator/analytics/sale-reviews
  const saleReviewsAnalytics =
    await api.functional.shoppingMall.administrator.analytics.sale_reviews.getSaleReviewsAnalytics(
      adminConnection,
    );
  typia.assert(saleReviewsAnalytics);
  // Validate response properties exist and are of proper type
  TestValidator.predicate(
    "totalCount is int",
    Number.isInteger(saleReviewsAnalytics.totalCount),
  );
  TestValidator.predicate(
    "averageRating is number",
    typeof saleReviewsAnalytics.averageRating === "number",
  );
  TestValidator.predicate(
    "minimumRating is int",
    Number.isInteger(saleReviewsAnalytics.minimumRating),
  );
  TestValidator.predicate(
    "maximumRating is int",
    Number.isInteger(saleReviewsAnalytics.maximumRating),
  );
  // Check starRatingCounts keys and values
  for (const key of ["1", "2", "3", "4", "5"] as const) {
    TestValidator.predicate(
      `starRatingCounts has key ${key}`,
      key in saleReviewsAnalytics.starRatingCounts,
    );
    TestValidator.predicate(
      `starRatingCounts[${key}] is int`,
      Number.isInteger(saleReviewsAnalytics.starRatingCounts[key]),
    );
  }
  // Scenario 2: Authorization enforcement test
  await TestValidator.httpError(
    "Unauthorized access to sale reviews analytics",
    401,
    async () => {
      // Use a connection without Authorization header
      const noAuthConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.administrator.analytics.sale_reviews.getSaleReviewsAnalytics(
        noAuthConnection,
      );
    },
  );
}
