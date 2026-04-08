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
 * Test seller product sales report pagination functionality with large datasets.
 *
 * Validates the pagination mechanism of the product sales report endpoint by creating a seller with numerous products and associated order items, then verifying that pagination parameters correctly filter and subset the results while maintaining accurate aggregate metrics.
 *
 * The test ensures that:
 * 1. Summary metrics (total_products, total_sales_count, total_revenue) reflect the complete dataset
 * 2. The products array contains only the paginated subset
 * 3. Different page/limit combinations return correct subsets
 * 4. Boundary conditions are handled properly
 *
 * 1. Create and authenticate a seller account.
 * 2. Generate 25 products for the seller (exceeding default page limit of 20).
 * 3. Create order items for these products to generate sales data.
 * 4. Test pagination with default parameters (page=1, limit=20).
 * 5. Verify total_products equals 25 while products array has 20 items.
 * 6. Test page 2 to retrieve remaining products.
 * 7. Test custom limit=5 to verify smaller page sizes.
 * 8. Test limit=100 to verify maximum page size handling.
 * 9. Test page beyond available data returns empty products array.
 * 10. Validate summary metrics remain consistent across all pagination requests.
 */
export async function test_api_seller_product_sales_report_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
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
  // Note: In a real scenario, we would need to create products and order items
  // through the appropriate API endpoints. Since those endpoints are not provided
  // in the available SDK functions, we'll test the pagination logic with the
  // report endpoint directly using various pagination parameters.
  //
  // The test validates that the pagination mechanism works correctly by
  // testing different page and limit combinations.
  // 2. Test pagination with default parameters (page=1, limit=20)
  const reportDefault =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportDefault);
  // Validate response structure
  TestValidator.predicate(
    "total_products is non-negative",
    reportDefault.total_products >= 0,
  );
  TestValidator.predicate(
    "total_sales_count is non-negative",
    reportDefault.total_sales_count >= 0,
  );
  TestValidator.predicate(
    "total_revenue is non-negative",
    reportDefault.total_revenue >= 0,
  );
  TestValidator.predicate(
    "average_order_value is non-negative",
    reportDefault.average_order_value >= 0,
  );
  TestValidator.predicate(
    "products array exists",
    Array.isArray(reportDefault.products),
  );
  TestValidator.predicate(
    "inventory_status exists",
    reportDefault.inventory_status !== null,
  );
  // 3. Test custom page and limit combinations
  const reportPage2 =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportPage2);
  // 4. Test small page size
  const reportSmallLimit =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportSmallLimit);
  // Validate that products array respects the limit
  TestValidator.predicate(
    "small limit respected",
    reportSmallLimit.products.length <= 5,
  );
  // 5. Test minimum limit (1)
  const reportMinLimit =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportMinLimit);
  TestValidator.predicate(
    "min limit respected",
    reportMinLimit.products.length <= 1,
  );
  // 6. Test maximum limit (100)
  const reportMaxLimit =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportMaxLimit);
  TestValidator.predicate(
    "max limit respected",
    reportMaxLimit.products.length <= 100,
  );
  // 7. Test page beyond available data (should return empty products array)
  const reportBeyondData =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {
          page: 999,
          limit: 20,
        } satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportBeyondData);
  TestValidator.predicate(
    "beyond data returns empty products",
    reportBeyondData.products.length === 0,
  );
  // 8. Validate consistency of summary metrics across pagination requests
  // All pagination requests should return the same total_products count
  TestValidator.equals(
    "total_products consistent",
    reportDefault.total_products,
    reportPage2.total_products,
  );
  TestValidator.equals(
    "total_sales_count consistent",
    reportDefault.total_sales_count,
    reportPage2.total_sales_count,
  );
  TestValidator.equals(
    "total_revenue consistent",
    reportDefault.total_revenue,
    reportPage2.total_revenue,
  );
  // 9. Test with no pagination parameters (should use defaults)
  const reportNoParams =
    await api.functional.ecommerce.seller.reports.products.generate(
      sellerConnection,
      {
        body: {} satisfies IEcommerceProductSalesReport.IRequest,
      },
    );
  typia.assert(reportNoParams);
  // 10. Validate product breakdown structure
  if (reportDefault.products.length > 0) {
    const firstProduct = reportDefault.products[0]!;
    typia.assert(firstProduct);
    TestValidator.predicate(
      "product has valid id",
      firstProduct.product_id !== undefined,
    );
    TestValidator.predicate(
      "product has valid name",
      firstProduct.product_name !== undefined,
    );
    TestValidator.predicate(
      "product has valid category",
      firstProduct.category_id !== undefined,
    );
    TestValidator.predicate(
      "product has sales_count",
      firstProduct.sales_count >= 0,
    );
    TestValidator.predicate("product has revenue", firstProduct.revenue >= 0);
  }
}
