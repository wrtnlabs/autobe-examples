import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_empty_results_future_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create future date range that will have no matching orders
  const futureStartDate = new Date();
  futureStartDate.setFullYear(futureStartDate.getFullYear() + 1); // 1 year in future
  const futureEndDate = new Date();
  futureEndDate.setFullYear(futureEndDate.getFullYear() + 2); // 2 years in future
  // 3. Request analytics with future date range
  const analytics = await api.functional.ecommerce.admin.analytics.index(
    adminConnection,
    {
      body: {
        start_date: futureStartDate.toISOString(),
        end_date: futureEndDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IEcommerceAnalytic.IRequest,
    },
  );
  typia.assert(analytics);
  // 4. Validate that we received exactly one analytics result
  TestValidator.equals("data array has one result", analytics.data.length, 1);
  // Get the analytics result for validation
  const result = analytics.data[0];
  // 5. Validate order metrics are zero
  TestValidator.equals(
    "order total count is zero",
    result.order_metrics.total_count,
    0,
  );
  TestValidator.equals(
    "order total revenue is zero",
    result.order_metrics.total_revenue,
    0,
  );
  TestValidator.equals(
    "order average value is zero",
    result.order_metrics.average_order_value,
    0,
  );
  // 6. Validate status breakdown is empty array
  TestValidator.equals(
    "status breakdown is empty",
    result.status_breakdown.length,
    0,
  );
  // 7. Validate category performance is empty array
  TestValidator.equals(
    "category performance is empty",
    result.category_performance.length,
    0,
  );
  // 8. Validate top products is empty array
  TestValidator.equals("top products is empty", result.top_products.length, 0);
  // 9. Validate customer metrics are zero
  TestValidator.equals(
    "new customers is zero",
    result.customer_metrics.new_customers,
    0,
  );
  TestValidator.equals(
    "repeat customers is zero",
    result.customer_metrics.repeat_customers,
    0,
  );
  TestValidator.equals(
    "total customers is zero",
    result.customer_metrics.total_customers,
    0,
  );
  // 10. Validate inventory metrics are zero
  TestValidator.equals(
    "low stock count is zero",
    result.inventory_metrics.low_stock_count,
    0,
  );
  TestValidator.equals(
    "out of stock count is zero",
    result.inventory_metrics.out_of_stock_count,
    0,
  );
  TestValidator.equals(
    "total variants is zero",
    result.inventory_metrics.total_variants,
    0,
  );
  // 11. Validate pagination metadata
  TestValidator.equals("current page is 1", analytics.pagination.current, 1);
  TestValidator.equals(
    "records count is zero",
    analytics.pagination.records,
    0,
  );
  TestValidator.equals("pages count is zero", analytics.pagination.pages, 0);
}
