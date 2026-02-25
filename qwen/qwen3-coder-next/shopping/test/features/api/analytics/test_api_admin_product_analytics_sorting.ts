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

export async function test_api_admin_product_analytics_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test sorting by newest (default)
  const newestResults =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          sort: "newest",
          limit: 5,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(newestResults);
  // Test sorting by price ascending
  const priceAscResults =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          sort: "price_asc",
          limit: 5,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(priceAscResults);
  // Test sorting by price descending
  const priceDescResults =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          sort: "price_desc",
          limit: 5,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(priceDescResults);
  // Test sorting by views descending
  const viewsDescResults =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          sort: "views_desc",
          limit: 5,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(viewsDescResults);
  // Test sorting by sales descending
  const salesDescResults =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          sort: "sales_desc",
          limit: 5,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(salesDescResults);
  // Test sorting by rating descending
  const ratingDescResults =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          sort: "rating_desc",
          limit: 5,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(ratingDescResults);
  // Verify pagination works correctly
  const firstPage =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(secondPage);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination has correct page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination has records count",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    firstPage.pagination.pages >= 0,
  );
  // Verify results contain expected fields
  if (firstPage.data.length > 0) {
    const firstItem = firstPage.data[0];
    TestValidator.equals(
      "first item has product_id",
      typeof firstItem.product_id,
      "string",
    );
    TestValidator.equals(
      "first item has product_name",
      typeof firstItem.product_name,
      "string",
    );
    TestValidator.equals(
      "first item has product_thumbnail",
      typeof firstItem.product_thumbnail,
      "string",
    );
    TestValidator.predicate(
      "first item has total_views",
      typeof firstItem.total_views === "number",
    );
    TestValidator.predicate(
      "first item has unique_viewers",
      typeof firstItem.unique_viewers === "number",
    );
    TestValidator.predicate(
      "first item has view_to_purchase_conversion",
      typeof firstItem.view_to_purchase_conversion === "number",
    );
    TestValidator.predicate(
      "first item has sales_units",
      typeof firstItem.sales_units === "number",
    );
    TestValidator.predicate(
      "first item has revenue",
      typeof firstItem.revenue === "number",
    );
    TestValidator.predicate(
      "first item has current_stock",
      typeof firstItem.current_stock === "number",
    );
    TestValidator.predicate(
      "first item has turnover_rate",
      typeof firstItem.turnover_rate === "number",
    );
    TestValidator.predicate(
      "first item has average_rating",
      typeof firstItem.average_rating === "number",
    );
    TestValidator.predicate(
      "first item has review_count",
      typeof firstItem.review_count === "number",
    );
    TestValidator.equals(
      "first item has price_range",
      typeof firstItem.price_range,
      "string",
    );
    TestValidator.equals(
      "first item has seller_id",
      typeof firstItem.seller_id,
      "string",
    );
    TestValidator.equals(
      "first item has seller_name",
      typeof firstItem.seller_name,
      "string",
    );
  }
}
