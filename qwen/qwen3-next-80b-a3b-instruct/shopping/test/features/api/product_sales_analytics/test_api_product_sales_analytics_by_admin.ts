import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSalesStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSalesStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSalesStat";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_sales_analytics_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Call the product sales analytics endpoint with no filters
  const salesStats: IPageIShoppingMallProductSalesStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.products.sales.index(
      adminConnection,
      {
        body: {} as IShoppingMallProductSalesStat.IRequest,
      },
    );
  typia.assert(salesStats);
  // Step 3: Validate the response structure
  // Confirm pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    salesStats.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination.current >= 0",
    salesStats.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    salesStats.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    salesStats.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    salesStats.pagination.pages >= 0,
  );
  // Confirm data array exists
  TestValidator.predicate("data array exists", Array.isArray(salesStats.data));
  // Validate each product sales summary
  for (const item of salesStats.data) {
    // Validate required fields with appropriate types and non-negative values
    TestValidator.predicate(
      "sales_volume is non-negative integer",
      item.sales_volume >= 0,
    );
    TestValidator.predicate(
      "revenue is non-negative number",
      item.revenue >= 0,
    );
    TestValidator.predicate(
      "view_count is non-negative integer",
      item.view_count >= 0,
    );
    TestValidator.predicate(
      "inventory_level is non-negative integer",
      item.inventory_level >= 0,
    );
    // Validate stock_status is one of the allowed enum values
    TestValidator.predicate(
      "stock_status is valid",
      ["in_stock", "low_stock", "out_of_stock", "backordered"].includes(
        item.stock_status,
      ),
    );
  }
}
