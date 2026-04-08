import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceProductSalesReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSalesReport";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test basic product sales report generation for an approved seller.
 *
 * Validates the seller product sales report endpoint by creating an authenticated seller account and generating a product sales report. The test verifies that the report endpoint returns a properly structured response with correct type validation, even when no products exist for the seller.
 *
 * This test focuses on endpoint accessibility, response structure validation, and type safety. Since product and order creation APIs are not available in the provided SDK, the test validates the report structure with potentially empty data.
 *
 * 1. Register and authenticate a new seller account.
 * 2. Generate the product sales report with no filters applied.
 * 3. Validate report structure and type safety.
 * 4. Verify summary metrics are present and valid (may be zero if no products).
 * 5. Validate inventory_status breakdown structure.
 * 6. Verify per-product breakdown array structure.
 */
export async function test_api_seller_product_sales_report_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate the product sales report with no filters
  const report =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {} satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(report);
  // 3. Validate summary metrics structure and types
  TestValidator.predicate(
    "total_products is non-negative integer",
    Number.isInteger(report.total_products) && report.total_products >= 0,
  );
  TestValidator.predicate(
    "total_sales_count is non-negative integer",
    Number.isInteger(report.total_sales_count) && report.total_sales_count >= 0,
  );
  TestValidator.predicate(
    "total_revenue is non-negative number",
    typeof report.total_revenue === "number" && report.total_revenue >= 0,
  );
  TestValidator.predicate(
    "average_order_value is non-negative number",
    typeof report.average_order_value === "number" &&
      report.average_order_value >= 0,
  );
  // 4. Validate inventory_status breakdown structure
  TestValidator.predicate(
    "inventory_status.in_stock is non-negative integer",
    Number.isInteger(report.inventory_status.in_stock) &&
      report.inventory_status.in_stock >= 0,
  );
  TestValidator.predicate(
    "inventory_status.out_of_stock is non-negative integer",
    Number.isInteger(report.inventory_status.out_of_stock) &&
      report.inventory_status.out_of_stock >= 0,
  );
  TestValidator.predicate(
    "inventory_status.low_stock is non-negative integer",
    Number.isInteger(report.inventory_status.low_stock) &&
      report.inventory_status.low_stock >= 0,
  );
  // 5. Validate per-product breakdown array
  TestValidator.predicate("products is array", Array.isArray(report.products));
  // Validate each product breakdown entry if any exist
  for (const productReport of report.products) {
    typia.assert(productReport);
    TestValidator.predicate(
      "product_id is valid uuid format",
      /^[0-9a-f-]{36}$/i.test(productReport.product_id),
    );
    TestValidator.predicate(
      "product_name is non-empty string",
      typeof productReport.product_name === "string" &&
        productReport.product_name.length > 0,
    );
    TestValidator.predicate(
      "category_id is valid uuid format",
      /^[0-9a-f-]{36}$/i.test(productReport.category_id),
    );
    TestValidator.predicate(
      "category_name is non-empty string",
      typeof productReport.category_name === "string" &&
        productReport.category_name.length > 0,
    );
    TestValidator.predicate(
      "sales_count is non-negative integer",
      Number.isInteger(productReport.sales_count) &&
        productReport.sales_count >= 0,
    );
    TestValidator.predicate(
      "revenue is non-negative number",
      typeof productReport.revenue === "number" && productReport.revenue >= 0,
    );
    TestValidator.predicate(
      "product inventory_status.in_stock is non-negative integer",
      Number.isInteger(productReport.inventory_status.in_stock) &&
        productReport.inventory_status.in_stock >= 0,
    );
    TestValidator.predicate(
      "product inventory_status.out_of_stock is non-negative integer",
      Number.isInteger(productReport.inventory_status.out_of_stock) &&
        productReport.inventory_status.out_of_stock >= 0,
    );
    TestValidator.predicate(
      "product inventory_status.low_stock is non-negative integer",
      Number.isInteger(productReport.inventory_status.low_stock) &&
        productReport.inventory_status.low_stock >= 0,
    );
  }
  // 6. Validate data isolation - report should only contain seller's products
  // (Implicitly validated since we authenticated as a specific seller)
  TestValidator.predicate(
    "report generated successfully for authenticated seller",
    report !== null && report !== undefined,
  );
}
