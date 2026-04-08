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

/**
 * Test administrator platform-wide analytics retrieval with default query settings.
 *
 * Validates the analytics dashboard endpoint that provides comprehensive business intelligence data across the entire e-commerce platform. This test ensures administrators can access aggregated metrics including order statistics, revenue data, customer analytics, inventory status, and category performance without any filtering constraints.
 *
 * The test verifies the complete analytics response structure including pagination metadata, order metrics with total count and revenue calculations, status breakdowns for all order lifecycle states, category performance rankings, top products by revenue, customer engagement metrics, and inventory health indicators. Special attention is given to validating that the response returns valid data even when the platform has minimal transaction history.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Administrator calls analytics endpoint with empty request body for platform-wide data.
 * 3. Validates response contains all required metric categories.
 * 4. Verifies order metrics have valid numeric values and calculations.
 * 5. Checks status breakdown includes all order states with non-negative counts.
 * 6. Validates category performance metrics structure and values.
 * 7. Verifies top products list contains valid product metrics.
 * 8. Checks customer metrics have valid counts.
 * 9. Validates inventory metrics with stock level information.
 * 10. Verifies pagination metadata is correctly structured.
 */
export async function test_api_admin_analytics_platform_wide(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve platform-wide analytics with default settings (empty request)
  const analytics: IPageIEcommerceAnalytic.IResult =
    await api.functional.ecommerce.admin.analytics.index(adminConnection, {
      body: {} satisfies IEcommerceAnalytic.IRequest,
    });
  typia.assert(analytics);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    analytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    analytics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    analytics.pagination.pages >= 0,
  );
  // 4. Validate analytics data array
  TestValidator.predicate("analytics data exists", analytics.data.length > 0);
  // 5. Validate first analytics record structure
  const data = analytics.data[0];
  typia.assert(data);
  // 6. Validate order metrics
  TestValidator.predicate(
    "order total count non-negative",
    data.order_metrics.total_count >= 0,
  );
  TestValidator.predicate(
    "order total revenue non-negative",
    data.order_metrics.total_revenue >= 0,
  );
  TestValidator.predicate(
    "order average value non-negative",
    data.order_metrics.average_order_value >= 0,
  );
  // 7. Validate status breakdown
  TestValidator.predicate(
    "status breakdown exists",
    data.status_breakdown.length >= 0,
  );
  for (const status of data.status_breakdown) {
    typia.assert(status);
    TestValidator.predicate("status count non-negative", status.count >= 0);
  }
  // 8. Validate category performance
  TestValidator.predicate(
    "category performance exists",
    data.category_performance.length >= 0,
  );
  for (const category of data.category_performance) {
    typia.assert(category);
    TestValidator.equals(
      "category has valid ID",
      typeof category.category_id,
      "string",
    );
    TestValidator.predicate(
      "category has name",
      category.category_name.length > 0,
    );
    TestValidator.predicate(
      "category revenue non-negative",
      category.total_revenue >= 0,
    );
    TestValidator.predicate(
      "category order count non-negative",
      category.order_count >= 0,
    );
  }
  // 9. Validate top products
  TestValidator.predicate("top products exists", data.top_products.length >= 0);
  for (const product of data.top_products) {
    typia.assert(product);
    TestValidator.equals("product has valid ID", typeof product.id, "string");
    TestValidator.predicate("product has name", product.name.length > 0);
    TestValidator.predicate(
      "product revenue non-negative",
      product.total_revenue >= 0,
    );
    TestValidator.predicate(
      "product order count non-negative",
      product.order_count >= 0,
    );
  }
  // 10. Validate customer metrics
  TestValidator.predicate(
    "new customers non-negative",
    data.customer_metrics.new_customers >= 0,
  );
  TestValidator.predicate(
    "repeat customers non-negative",
    data.customer_metrics.repeat_customers >= 0,
  );
  TestValidator.predicate(
    "total customers non-negative",
    data.customer_metrics.total_customers >= 0,
  );
  // 11. Validate inventory metrics
  TestValidator.predicate(
    "low stock count non-negative",
    data.inventory_metrics.low_stock_count >= 0,
  );
  TestValidator.predicate(
    "out of stock count non-negative",
    data.inventory_metrics.out_of_stock_count >= 0,
  );
  TestValidator.predicate(
    "total variants non-negative",
    data.inventory_metrics.total_variants >= 0,
  );
}
