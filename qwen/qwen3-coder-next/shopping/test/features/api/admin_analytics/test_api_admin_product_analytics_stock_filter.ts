import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAnalytic";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_analytics_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Login as admin to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Get analytics data with in_stock_only=true
  const analyticsData =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          in_stock_only: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  // 3. Validate response structure
  typia.assert(analyticsData);
  // 4. Verify that all returned products have in-stock data
  for (const product of analyticsData.data) {
    // Verify current_stock is greater than 0 for all in-stock products
    TestValidator.predicate(
      `product ${product.product_id} has positive stock`,
      product.current_stock > 0,
    );
    // Verify turnover rate calculation makes sense for in-stock products
    TestValidator.predicate(
      `product ${product.product_id} has valid turnover rate`,
      typeof product.turnover_rate === "number",
    );
    // Verify product information is present
    TestValidator.predicate(
      `product ${product.product_id} has name`,
      typeof product.product_name === "string" &&
        product.product_name.length > 0,
    );
    // Verify thumbnail URL exists
    TestValidator.predicate(
      `product ${product.product_id} has thumbnail`,
      typeof product.product_thumbnail === "string" &&
        product.product_thumbnail.length > 0,
    );
    // Verify sales metrics are present
    TestValidator.predicate(
      `product ${product.product_id} has valid sales units`,
      product.sales_units >= 0,
    );
    // Verify rating metrics are present
    TestValidator.predicate(
      `product ${product.product_id} has valid average rating`,
      product.average_rating >= 0 && product.average_rating <= 5,
    );
  }
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination has correct structure",
    analyticsData.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    analyticsData.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    analyticsData.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    analyticsData.pagination.pages >= 0,
  );
}
