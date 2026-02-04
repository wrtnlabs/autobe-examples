import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSalesMonthlyStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesMonthlyStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sales_monthly_statistics(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  const statistics: IShoppingMallSalesMonthlyStatistic =
    await api.functional.shoppingMall.seller.analytics.orders.sales.index(
      sellerConnection,
    );
  typia.assert(statistics);
  TestValidator.predicate(
    "order count should be non-negative",
    statistics.orderCount >= 0,
  );
  TestValidator.predicate(
    "total amount should be non-negative",
    statistics.totalAmount >= 0,
  );
  TestValidator.predicate(
    "average order value should be non-negative",
    statistics.averageOrderValue >= 0,
  );
  TestValidator.predicate(
    "total amount should be consistent with order count and average",
    statistics.orderCount === 0
      ? statistics.totalAmount === 0
      : statistics.totalAmount >= statistics.averageOrderValue,
  );
}
