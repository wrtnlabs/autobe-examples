import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSalesAnalytic";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSalesAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sales_analytics_multi_filter_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Query analytics with multiple filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const analyticsResult =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          date_from: thirtyDaysAgo.toISOString(),
          date_to: now.toISOString(),
          status: "delivered",
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(analyticsResult);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination exists",
    analyticsResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(analyticsResult.data),
    true,
  );
  TestValidator.predicate(
    "current page is positive",
    analyticsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    analyticsResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    analyticsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    analyticsResult.pagination.pages >= 0,
  );
  // 4. Validate each analytics record
  for (const record of analyticsResult.data) {
    typia.assert(record);
    TestValidator.predicate(
      "total revenue is non-negative",
      record.totalRevenue >= 0,
    );
    TestValidator.predicate(
      "order count is non-negative",
      record.orderCount >= 0,
    );
    TestValidator.predicate(
      "average order value is non-negative",
      record.averageOrderValue >= 0,
    );
    TestValidator.predicate(
      "item count is non-negative",
      record.itemCount >= 0,
    );
    TestValidator.predicate("date is valid", record.date !== undefined);
  }
  // 5. Test with status filter - delivered should exclude cancelled/refunded
  const deliveredAnalytics =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          date_from: thirtyDaysAgo.toISOString(),
          date_to: now.toISOString(),
          status: "delivered",
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(deliveredAnalytics);
  // All records with status filter should have status field set
  for (const record of deliveredAnalytics.data) {
    TestValidator.equals("status filter applied", record.status, "delivered");
  }
  // 6. Test with category filter
  const categoryAnalytics =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          date_from: thirtyDaysAgo.toISOString(),
          date_to: now.toISOString(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(categoryAnalytics);
  // All records with category filter should have categoryId field set
  for (const record of categoryAnalytics.data) {
    TestValidator.predicate(
      "category filter applied",
      record.categoryId !== undefined && record.categoryId !== null,
    );
  }
  // 7. Test pagination metadata consistency
  TestValidator.equals(
    "pagination current matches request",
    analyticsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    analyticsResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    analyticsResult.pagination.pages ===
      Math.ceil(
        analyticsResult.pagination.records / analyticsResult.pagination.limit,
      ),
  );
}
