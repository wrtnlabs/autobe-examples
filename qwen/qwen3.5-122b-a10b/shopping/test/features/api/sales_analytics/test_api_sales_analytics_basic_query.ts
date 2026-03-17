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

export async function test_api_sales_analytics_basic_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.alphabets(10),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Query sales analytics with valid date range (within 90 days)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const analytics =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerConnection,
      {
        body: {
          date_from: ninetyDaysAgo.toISOString(),
          date_to: now.toISOString(),
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallSalesAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    analytics.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", analytics.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    analytics.pagination.pages >= 0,
  );
  // 4. Verify response data structure
  TestValidator.predicate("data is array", Array.isArray(analytics.data));
  // If data exists, verify each summary record structure
  if (analytics.data.length > 0) {
    const firstRecord = analytics.data[0];
    TestValidator.predicate("has id", typeof firstRecord.id === "string");
    TestValidator.predicate("has date", typeof firstRecord.date === "string");
    TestValidator.predicate(
      "totalRevenue is non-negative",
      firstRecord.totalRevenue >= 0,
    );
    TestValidator.predicate(
      "orderCount is non-negative",
      firstRecord.orderCount >= 0,
    );
    TestValidator.predicate(
      "averageOrderValue is non-negative",
      firstRecord.averageOrderValue >= 0,
    );
    TestValidator.predicate(
      "itemCount is non-negative",
      firstRecord.itemCount >= 0,
    );
  }
}
