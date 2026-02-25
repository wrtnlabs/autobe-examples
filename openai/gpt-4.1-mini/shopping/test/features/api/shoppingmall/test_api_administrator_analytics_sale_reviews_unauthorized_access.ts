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

export async function test_api_administrator_analytics_sale_reviews_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Access sale reviews analytics operation without authentication to ensure security.
  // - Send GET request to /shoppingMall/administrator/analytics/sale-reviews with no auth headers.
  // - Verify HTTP 401 Unauthorized status.
  // - Validate response body contains appropriate error information about missing or invalid authentication.
  // - Confirm system blocks access as per security compliance requirements.
  // Use base connection with NO authentication headers
  await TestValidator.httpError(
    "unauthorized access is blocked",
    401,
    async () => {
      // Directly use base connection to simulate no auth
      await api.functional.shoppingMall.administrator.analytics.sale_reviews.getSaleReviewsAnalytics(
        connection,
      );
    },
  );
}
