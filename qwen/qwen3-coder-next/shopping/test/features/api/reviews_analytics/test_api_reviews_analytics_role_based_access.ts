import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshotAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_reviews_analytics_role_based_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuthorized);
  // 2. Call reviews analytics endpoint (basic access for authenticated users)
  const analytics =
    await api.functional.shoppingMall.products.reviews.analytics.reviewsAnalytics(
      customerConnection,
      {
        productId: "00000000-0000-0000-0000-000000000000",
      },
    );
  typia.assert(analytics);
}
