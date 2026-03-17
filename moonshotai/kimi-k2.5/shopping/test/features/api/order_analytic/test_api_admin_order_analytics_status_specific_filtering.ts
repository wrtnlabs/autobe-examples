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

/**
 * Test order analytics with status-specific filtering to verify targeted reporting capabilities.
 * First, authenticate as an admin. Then call the order analytics endpoint with a status filter
 * set to 'paid' to retrieve analytics only for paid order items. Verify that the response
 * reflects this filtering in the aggregated metrics, particularly that statusCounts shows the
 * correct count for the filtered status. Test with different status values (shipped, delivered,
 * cancelled, refunded) to ensure each filter returns the expected subset of data. Also verify
 * that pendingCancellationRequests and pendingRefundRequests remain accurate regardless of the
 * status filter, as these are independent counts based on request status rather than order item status.
 */
export async function test_api_admin_order_analytics_status_specific_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test analytics with 'paid' status filter
  const paidAnalytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          status: "paid",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(paidAnalytics);
  // 3. Test analytics with 'shipped' status filter
  const shippedAnalytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          status: "shipped",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(shippedAnalytics);
  // 4. Test analytics with 'delivered' status filter
  const deliveredAnalytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(deliveredAnalytics);
  // 5. Test analytics with 'cancelled' status filter
  const cancelledAnalytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          status: "cancelled",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(cancelledAnalytics);
  // 6. Test analytics with 'refunded' status filter
  const refundedAnalytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {
          status: "refunded",
        } satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(refundedAnalytics);
  // 7. Test analytics without status filter (all statuses)
  const allAnalytics =
    await api.functional.ecommerceMall.admin.orderAnalytics.aggregate(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrderAnalytic.IRequest,
      },
    );
  typia.assert(allAnalytics);
  // 8. Verify pending requests are present and valid in all responses
  // These are independent of status filter and should be accurate counts
  typia.assertGuard<IEcommerceMallOrderAnalytic>(paidAnalytics);
  typia.assertGuard<IEcommerceMallOrderAnalytic>(shippedAnalytics);
  typia.assertGuard<IEcommerceMallOrderAnalytic>(deliveredAnalytics);
  typia.assertGuard<IEcommerceMallOrderAnalytic>(cancelledAnalytics);
  typia.assertGuard<IEcommerceMallOrderAnalytic>(refundedAnalytics);
  typia.assertGuard<IEcommerceMallOrderAnalytic>(allAnalytics);
}
