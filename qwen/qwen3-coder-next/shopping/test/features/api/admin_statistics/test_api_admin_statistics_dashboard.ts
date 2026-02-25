import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
import type { IShoppingMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesAnalytic";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import type { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_statistics_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and login as admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Call the statistics endpoint
  const statistics =
    await api.functional.shoppingMall.admin.statistics.at(adminConnection);
  typia.assert(statistics);
  // Validate product analytics
  TestValidator.predicate(
    "totalProductCount is non-negative",
    statistics.products.totalProductCount >= 0,
  );
  TestValidator.predicate(
    "averageRating is valid",
    statistics.products.averageRating >= 0 &&
      statistics.products.averageRating <= 5,
  );
  TestValidator.predicate(
    "reviewCount is non-negative",
    statistics.products.reviewCount >= 0,
  );
  TestValidator.predicate(
    "ratingDistribution has 1-5 ratings",
    statistics.products.ratingDistribution["1"] !== undefined &&
      statistics.products.ratingDistribution["2"] !== undefined &&
      statistics.products.ratingDistribution["3"] !== undefined &&
      statistics.products.ratingDistribution["4"] !== undefined &&
      statistics.products.ratingDistribution["5"] !== undefined,
  );
  // Validate order analytics
  TestValidator.predicate(
    "order_count is non-negative",
    statistics.orders.order_count >= 0,
  );
  TestValidator.predicate(
    "sales_amount is non-negative",
    statistics.orders.sales_amount >= 0,
  );
  TestValidator.predicate(
    "average_order_value is non-negative",
    statistics.orders.average_order_value >= 0,
  );
  TestValidator.predicate(
    "status_distribution exists",
    statistics.orders.status_distribution >= 0,
  );
  TestValidator.predicate(
    "temporal_trends exists",
    statistics.orders.temporal_trends >= 0,
  );
  // Validate revenue analytics
  TestValidator.predicate(
    "total_sales_amount is non-negative",
    statistics.revenue.total_sales_amount >= 0,
  );
  TestValidator.predicate(
    "total_orders_count is non-negative",
    statistics.revenue.total_orders_count >= 0,
  );
  TestValidator.predicate(
    "average_order_value is non-negative",
    statistics.revenue.average_order_value >= 0,
  );
  TestValidator.predicate(
    "date_range_start is valid date format",
    /^\d{4}-\d{2}-\d{2}$/.test(statistics.revenue.date_range_start),
  );
  TestValidator.predicate(
    "date_range_end is valid date format",
    /^\d{4}-\d{2}-\d{2}$/.test(statistics.revenue.date_range_end),
  );
  // Validate trend arrays exist (may be empty)
  TestValidator.predicate(
    "sales_trend_daily exists",
    Array.isArray(statistics.revenue.sales_trend_daily),
  );
  TestValidator.predicate(
    "sales_trend_weekly exists",
    Array.isArray(statistics.revenue.sales_trend_weekly),
  );
  TestValidator.predicate(
    "sales_trend_monthly exists",
    Array.isArray(statistics.revenue.sales_trend_monthly),
  );
  TestValidator.predicate(
    "seller_breakdown exists",
    Array.isArray(statistics.revenue.seller_breakdown),
  );
  TestValidator.predicate(
    "category_breakdown exists",
    Array.isArray(statistics.revenue.category_breakdown),
  );
}
