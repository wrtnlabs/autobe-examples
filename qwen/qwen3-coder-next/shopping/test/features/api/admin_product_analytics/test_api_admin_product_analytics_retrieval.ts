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

export async function test_api_admin_product_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test basic analytics retrieval
  const basicAnalytics =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // 3. Test with category filter
  const categoryAnalytics =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(categoryAnalytics);
  // 4. Test with price range filter
  const priceRangeAnalytics =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          min_price: 1000 as number & tags.Minimum<0>,
          max_price: 100000 as number & tags.Minimum<0>,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(priceRangeAnalytics);
  // 5. Test with in-stock filter
  const inStockAnalytics =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          in_stock_only: true,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(inStockAnalytics);
  // 6. Test with pagination
  const paginatedAnalytics =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          page: 1 as number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 20 as number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallProductAnalytic.IRequest,
      },
    );
  typia.assert(paginatedAnalytics);
  // 7. Test with sorting options
  const sortOptions: IShoppingMallProductAnalytic.IRequest["sort"][] = [
    "newest",
    "price_asc",
    "price_desc",
    "views_desc",
    "sales_desc",
    "rating_desc",
  ];
  for (const sort of sortOptions) {
    const sortedAnalytics =
      await api.functional.shoppingMall.admin.analytics.products.index(
        adminConnection,
        {
          body: {
            sort: sort,
          } satisfies IShoppingMallProductAnalytic.IRequest,
        },
      );
    typia.assert(sortedAnalytics);
  }
  // 8. Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    basicAnalytics.pagination !== null,
  );
  TestValidator.predicate("data exists", Array.isArray(basicAnalytics.data));
  // 9. Verify data structure for first item if available
  if (basicAnalytics.data.length > 0) {
    const firstItem = basicAnalytics.data[0];
    TestValidator.equals(
      "has product_id",
      typeof firstItem.product_id,
      "string",
    );
    TestValidator.equals(
      "has product_name",
      typeof firstItem.product_name,
      "string",
    );
    TestValidator.equals(
      "has total_views",
      typeof firstItem.total_views,
      "number",
    );
    TestValidator.equals("has revenue", typeof firstItem.revenue, "number");
  }
}
