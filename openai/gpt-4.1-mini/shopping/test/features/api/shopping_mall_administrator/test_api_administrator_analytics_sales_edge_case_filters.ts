import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_analytics_sales_edge_case_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Update adminConnection headers with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare boundary price filter where min price equals max price
  const edgePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  // 3. Request sales analytics with edge case filters
  const salesResponse =
    await api.functional.shoppingMall.administrator.analytics.sales.index(
      adminConnection,
      {
        body: {
          price_min: edgePrice,
          price_max: edgePrice,
          inStock: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
  // 4. Assert response structure
  typia.assert(salesResponse);
  // 5. Validate all sales in data are in stock and have price exactly edgePrice
  for (const sale of salesResponse.data) {
    typia.assert(sale);
    TestValidator.predicate(
      "sale base price matches edgePrice",
      sale.basePrice === edgePrice,
    );
    TestValidator.predicate(
      "sale status indicates active",
      sale.status === "active" || sale.status === "approved",
    );
    // deletedAt can be null or undefined
    TestValidator.predicate(
      "sale is not deleted",
      sale.deletedAt === null || sale.deletedAt === undefined,
    );
  }
  // 6. Validate pagination metadata
  const pagination = salesResponse.pagination;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
}
