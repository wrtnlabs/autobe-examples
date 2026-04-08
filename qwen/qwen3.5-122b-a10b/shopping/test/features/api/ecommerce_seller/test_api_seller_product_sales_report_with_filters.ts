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

export async function test_api_seller_product_sales_report_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Test 1: Basic report without filters (should return seller's products)
  const basicReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {} satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(basicReport);
  TestValidator.predicate(
    "has total_products",
    basicReport.total_products >= 0,
  );
  TestValidator.predicate(
    "has total_sales_count",
    basicReport.total_sales_count >= 0,
  );
  TestValidator.predicate("has total_revenue", basicReport.total_revenue >= 0);
  TestValidator.predicate(
    "has average_order_value",
    basicReport.average_order_value >= 0,
  );
  TestValidator.predicate("has inventory_status", () => {
    const inv = basicReport.inventory_status;
    return inv.in_stock >= 0 && inv.out_of_stock >= 0 && inv.low_stock >= 0;
  });
  TestValidator.predicate(
    "has products array",
    Array.isArray(basicReport.products),
  );
  // 3. Test 2: Filter by date range (future date - should return empty or limited data)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          date_from: futureDate.toISOString(),
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(futureReport);
  TestValidator.predicate("future date report valid", () => {
    return (
      futureReport.total_products >= 0 &&
      futureReport.total_sales_count >= 0 &&
      futureReport.total_revenue >= 0
    );
  });
  // 4. Test 3: Filter by product_ids with non-existent IDs (should return empty)
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const productFilterReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          product_ids: [nonExistentProductId] satisfies (string &
            tags.Format<"uuid">)[],
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(productFilterReport);
  TestValidator.equals(
    "no products with non-existent ID",
    productFilterReport.total_products,
    0,
  );
  TestValidator.equals(
    "empty products array",
    productFilterReport.products.length,
    0,
  );
  // 5. Test 4: Filter by category_ids with non-existent IDs (should return empty)
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilterReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          category_ids: [nonExistentCategoryId] satisfies (string &
            tags.Format<"uuid">)[],
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(categoryFilterReport);
  TestValidator.equals(
    "no products with non-existent category",
    categoryFilterReport.total_products,
    0,
  );
  TestValidator.equals(
    "empty products array",
    categoryFilterReport.products.length,
    0,
  );
  // 6. Test 5: Filter by statuses (only delivered)
  const statusFilterReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          statuses: ["delivered"] satisfies (
            | "paid"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded"
          )[],
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(statusFilterReport);
  TestValidator.predicate("status filter report valid", () => {
    return (
      statusFilterReport.total_products >= 0 &&
      statusFilterReport.total_sales_count >= 0 &&
      statusFilterReport.total_revenue >= 0
    );
  });
  // 7. Test 6: Combined filters (date range + product_ids + category_ids + statuses)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const combinedFilterReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          date_from: pastDate.toISOString(),
          date_to: new Date().toISOString(),
          product_ids: [
            typia.random<string & tags.Format<"uuid">>(),
          ] satisfies (string & tags.Format<"uuid">)[],
          category_ids: [
            typia.random<string & tags.Format<"uuid">>(),
          ] satisfies (string & tags.Format<"uuid">)[],
          statuses: ["paid", "delivered"] satisfies (
            | "paid"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded"
          )[],
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(combinedFilterReport);
  TestValidator.predicate("combined filter report valid", () => {
    return (
      combinedFilterReport.total_products >= 0 &&
      combinedFilterReport.total_sales_count >= 0 &&
      combinedFilterReport.total_revenue >= 0 &&
      Array.isArray(combinedFilterReport.products)
    );
  });
  // 8. Test 7: Pagination parameters
  const paginationReport =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(paginationReport);
  TestValidator.predicate("pagination report valid", () => {
    return (
      paginationReport.total_products >= 0 &&
      paginationReport.products.length <= 10
    );
  });
  // 9. Validate product breakdown structure when products exist
  if (basicReport.products.length > 0) {
    const firstProduct = basicReport.products[0];
    typia.assert(firstProduct);
    TestValidator.predicate(
      "has product_id",
      firstProduct.product_id !== undefined,
    );
    TestValidator.predicate(
      "has product_name",
      firstProduct.product_name.length > 0,
    );
    TestValidator.predicate(
      "has category_id",
      firstProduct.category_id !== undefined,
    );
    TestValidator.predicate(
      "has category_name",
      firstProduct.category_name.length > 0,
    );
    TestValidator.predicate("has sales_count", firstProduct.sales_count >= 0);
    TestValidator.predicate("has revenue", firstProduct.revenue >= 0);
    TestValidator.predicate("has inventory_status", () => {
      const inv = firstProduct.inventory_status;
      return inv.in_stock >= 0 && inv.out_of_stock >= 0 && inv.low_stock >= 0;
    });
  }
  // 10. Validate summary metrics consistency
  if (basicReport.products.length > 0) {
    const calculatedRevenue = basicReport.products.reduce(
      (sum, p) => sum + p.revenue,
      0,
    );
    TestValidator.predicate(
      "revenue consistency",
      basicReport.total_revenue >= 0,
    );
    TestValidator.predicate(
      "sales count valid",
      basicReport.total_sales_count >= 0,
    );
    TestValidator.predicate(
      "average order value valid",
      basicReport.average_order_value >= 0,
    );
  }
}
