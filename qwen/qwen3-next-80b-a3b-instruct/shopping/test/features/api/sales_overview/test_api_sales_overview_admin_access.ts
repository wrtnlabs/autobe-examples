import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesByCategory";
import type { IShoppingMallSalesOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOverview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_overview_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create new admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Call sales overview endpoint using admin connection
  const salesOverview: IShoppingMallSalesOverview =
    await api.functional.shoppingMall.admin.analytics.sales.overview.index(
      adminConnection,
    );
  typia.assert(salesOverview);
  // Validate core sales metrics
  TestValidator.predicate(
    "totalRevenue is non-negative",
    salesOverview.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "totalOrders is non-negative",
    salesOverview.totalOrders >= 0,
  );
  TestValidator.predicate(
    "averageOrderValue is non-negative",
    salesOverview.averageOrderValue >= 0,
  );
  TestValidator.predicate(
    "completedOrderRate is between 0 and 1",
    salesOverview.completedOrderRate >= 0 &&
      salesOverview.completedOrderRate <= 1,
  );
  TestValidator.predicate(
    "itemsSold is non-negative",
    salesOverview.itemsSold >= 0,
  );
  TestValidator.predicate(
    "newCustomers is non-negative",
    salesOverview.newCustomers >= 0,
  );
  TestValidator.predicate(
    "returnRate is between 0 and 1",
    salesOverview.returnRate >= 0 && salesOverview.returnRate <= 1,
  );
  TestValidator.predicate(
    "avgDeliveryTime is non-negative",
    salesOverview.avgDeliveryTime >= 0,
  );
  // Validate sales by category
  TestValidator.predicate(
    "salesByCategory exists",
    !!salesOverview.salesByCategory,
  );
  TestValidator.predicate(
    "categoryName is string",
    typeof salesOverview.salesByCategory.categoryName === "string",
  );
  TestValidator.predicate(
    "totalRevenue is non-negative",
    salesOverview.salesByCategory.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "totalOrders is non-negative",
    salesOverview.salesByCategory.totalOrders >= 0,
  );
  TestValidator.predicate(
    "avgOrderValue is non-negative",
    salesOverview.salesByCategory.avgOrderValue >= 0,
  );
  TestValidator.predicate(
    "itemsSold is non-negative",
    salesOverview.salesByCategory.itemsSold >= 0,
  );
  TestValidator.predicate(
    "categoryRank is positive integer",
    salesOverview.salesByCategory.categoryRank >= 1,
  );
  TestValidator.predicate(
    "salesByCategory has non-empty categoryName",
    salesOverview.salesByCategory.categoryName.length > 0,
  );
}
