import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_analytics_full_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access order analytics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Call order analytics endpoint without any filters to retrieve all historical data
  const analytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 3. Verify all numeric values are non-negative as per business requirements
  TestValidator.predicate(
    "totalItems is non-negative",
    analytics.totalItems >= 0,
  );
  TestValidator.predicate(
    "totalRevenue is non-negative",
    analytics.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "paid status count is non-negative",
    analytics.statusCounts.paid >= 0,
  );
  TestValidator.predicate(
    "shipped status count is non-negative",
    analytics.statusCounts.shipped >= 0,
  );
  TestValidator.predicate(
    "delivered status count is non-negative",
    analytics.statusCounts.delivered >= 0,
  );
  TestValidator.predicate(
    "cancelled status count is non-negative",
    analytics.statusCounts.cancelled >= 0,
  );
  TestValidator.predicate(
    "refunded status count is non-negative",
    analytics.statusCounts.refunded >= 0,
  );
  TestValidator.predicate(
    "pendingCancellationRequests is non-negative",
    analytics.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests is non-negative",
    analytics.pendingRefundRequests >= 0,
  );
}
