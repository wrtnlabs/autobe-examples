import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSalesAnalytic";
import type { IShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSalesAnalytic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller sales analytics endpoint with authorization, pagination, and security checks.
 */
export async function test_api_seller_sales_analytics_success(
  connection: api.IConnection,
): Promise<void> {
  // Register and authorize seller
  const sellerConnection: IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  // Update sellerConnection with authorization token
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // Scenario 1: Retrieve sales analytics with empty filter body (DTO is empty)
  {
    const salesAnalytics =
      await api.functional.shoppingMall.seller.analytics.sales.index(
        sellerConnection,
        { body: {} },
      );
    typia.assert(salesAnalytics);
    // Validate pagination properties
    TestValidator.predicate(
      "pagination current is >= 1",
      salesAnalytics.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is >= 0",
      salesAnalytics.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination pages is >= 0",
      salesAnalytics.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records count is >= 0",
      salesAnalytics.pagination.records >= 0,
    );
    // Data is array
    TestValidator.predicate(
      "data is array",
      Array.isArray(salesAnalytics.data),
    );
    // Each summary is an object (no further checks due to empty DTO)
    for (const summary of salesAnalytics.data) {
      typia.assert(summary);
      TestValidator.predicate("summary is object", typeof summary === "object");
    }
  }
  // Scenario 2: Retrieve sales analytics without filters (empty body)
  {
    const salesAnalytics =
      await api.functional.shoppingMall.seller.analytics.sales.index(
        sellerConnection,
        { body: {} },
      );
    typia.assert(salesAnalytics);
    TestValidator.predicate(
      "pagination current is >= 1",
      salesAnalytics.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is >= 0",
      salesAnalytics.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination pages is >= 0",
      salesAnalytics.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records count is >= 0",
      salesAnalytics.pagination.records >= 0,
    );
    TestValidator.predicate(
      "data is array",
      Array.isArray(salesAnalytics.data),
    );
    for (const summary of salesAnalytics.data) {
      typia.assert(summary);
      TestValidator.predicate("summary is object", typeof summary === "object");
    }
  }
  // Scenario: Unauthorized access check
  {
    const unauthorizedConnection: IConnection = { host: connection.host };
    await TestValidator.httpError(
      "unauthorized access rejected",
      401,
      async () => {
        await api.functional.shoppingMall.seller.analytics.sales.index(
          unauthorizedConnection,
          { body: {} },
        );
      },
    );
  }
}
