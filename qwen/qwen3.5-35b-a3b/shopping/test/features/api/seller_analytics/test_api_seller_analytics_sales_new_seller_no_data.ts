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

export async function test_api_seller_analytics_sales_new_seller_no_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Ensure approval status is approved (simulated - in real scenario would require admin approval)
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "approved",
  );
  // 2. Create seller-specific connection with token
  const sellerApiConnection: api.IConnection = { host: connection.host };
  sellerApiConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 3. Fetch sales analytics for seller with no products/orders
  const analyticsResponse =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerApiConnection,
      {
        body: {} satisfies IEcommerceMallSalesAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 4. Validate response structure
  typia.assert(analyticsResponse.data);
  TestValidator.equals("data array length", analyticsResponse.data.length, 1);
  const summary = analyticsResponse.data[0];
  typia.assert(summary);
  // 5. Verify all counts are zero for new seller with no activity
  TestValidator.equals("product count is zero", summary.productCount, 0);
  TestValidator.equals("order item count is zero", summary.orderItemCount, 0);
  TestValidator.equals(
    "pending cancellation count is zero",
    summary.pendingCancellationCount,
    0,
  );
  TestValidator.equals(
    "pending refund count is zero",
    summary.pendingRefundCount,
    0,
  );
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination is valid",
    () =>
      analyticsResponse.pagination.current >= 0 &&
      analyticsResponse.pagination.limit > 0 &&
      analyticsResponse.pagination.records >= 0 &&
      analyticsResponse.pagination.pages >= 0,
  );
}