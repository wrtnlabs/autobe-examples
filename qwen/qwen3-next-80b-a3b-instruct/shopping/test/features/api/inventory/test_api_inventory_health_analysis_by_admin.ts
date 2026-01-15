import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryHealthProductBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHealthProductBreakdown";
import type { IShoppingMallInventoryHealthReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHealthReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_health_analysis_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Request inventory health report using authenticated admin connection
  const inventoryReport: IShoppingMallInventoryHealthReport =
    await api.functional.shoppingMall.admin.analytics.inventory.health.index(
      adminConnection,
    );
  typia.assert(inventoryReport);
  // Step 3: Validate overall health score is within valid range (0-100)
  TestValidator.predicate(
    "overall health score is between 0 and 100",
    inventoryReport.overall_health_score >= 0 &&
      inventoryReport.overall_health_score <= 100,
  );
  // Step 4: Validate total products analyzed is a non-negative integer
  TestValidator.predicate(
    "total products analyzed is non-negative integer",
    inventoryReport.total_products_analyzed >= 0,
  );
  // Step 5: Validate low stock alerts count is non-negative
  TestValidator.predicate(
    "products with low stock alerts is non-negative",
    inventoryReport.products_with_low_stock_alerts >= 0,
  );
  // Step 6: Validate out-of-stock products count is non-negative
  TestValidator.predicate(
    "products with all variants out of stock is non-negative",
    inventoryReport.products_with_all_variants_out_of_stock >= 0,
  );
  // Step 7: Validate insufficient stock products count is non-negative
  TestValidator.predicate(
    "products with insufficient stock is non-negative",
    inventoryReport.products_with_insufficient_stock >= 0,
  );
  // Step 8: Validate inventory health trend is one of allowed values
  TestValidator.predicate(
    "inventory health trend is valid",
    ["improving", "stable", "deteriorating"].includes(
      inventoryReport.inventory_health_trend,
    ),
  );
  // Step 9: Validate recommendations array exists and contains strings
  TestValidator.predicate(
    "recommendations is an array of strings",
    Array.isArray(inventoryReport.recommendations) &&
      inventoryReport.recommendations.every((item) => typeof item === "string"),
  );
  // Step 10: Validate product breakdown is an array and each item is a string
  TestValidator.predicate(
    "product breakdown is an array of strings",
    Array.isArray(inventoryReport.product_breakdown) &&
      inventoryReport.product_breakdown.every(
        (item) => typeof item === "string",
      ),
  );
}
